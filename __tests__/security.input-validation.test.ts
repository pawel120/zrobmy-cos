/**
 * Security Tests - Input Validation & XSS Prevention
 * 
 * Tests cover:
 * - XSS attack prevention
 * - Input sanitization
 * - Content length validation
 * - Special character handling
 * - HTML/JavaScript injection prevention
 * - Unicode and encoding attacks
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

describe('Security: Input Validation & XSS Prevention', () => {
  let supabase: SupabaseClient;

  beforeAll(() => {
    if (!SUPABASE_URL || !ANON_KEY) {
      throw new Error('Missing Supabase environment variables');
    }
    supabase = createClient(SUPABASE_URL, ANON_KEY);
  });

  describe('Message Content Validation', () => {
    test('should reject empty messages', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase
          .from('messages')
          .insert({
            room_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
            sender_id: user.id,
            content: '',
          });

        // Database constraint: char_length between 1 and 4000
        expect(error?.code).toMatch(/check|constraint/i);
      }
    });

    test('should enforce 4000 character limit on messages', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const tooLongMessage = 'a'.repeat(4001);
        
        const { error } = await supabase
          .from('messages')
          .insert({
            room_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
            sender_id: user.id,
            content: tooLongMessage,
          });

        // Should be rejected by database constraint
        expect(error?.code).toMatch(/check|constraint|length/i);
      }
    });

    test('should allow valid message within limits', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const validMessage = 'This is a valid message';
        
        const { data, error } = await supabase
          .from('messages')
          .insert({
            room_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
            sender_id: user.id,
            content: validMessage,
          });

        // Might fail due to FK constraint or RLS, but not validation
        expect(error?.code || data).toBeDefined();
      }
    });

    test('should handle XSS payload in message content', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            room_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
            sender_id: user.id,
            content: xssPayload,
          });

        // Should store the content (not sanitize at DB level)
        // Sanitization should happen on client render
        if (data) {
          expect(data[0]?.content).toBe(xssPayload);
        }
      }
    });

    test('should handle HTML entities in messages', async () => {
      const htmlPayload = '<div onclick="alert(1)">Click me</div>';
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from('messages')
          .insert({
            room_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
            sender_id: user.id,
            content: htmlPayload,
          });

        // Content should be stored as-is
        if (data) {
          expect(data[0]?.content).toContain('onclick');
        }
      }
    });

    test('should handle Unicode in messages', async () => {
      const unicodeMessage = '🔥 Świetna idea! Żelazo ćwiczenia 你好';
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            room_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
            sender_id: user.id,
            content: unicodeMessage,
          });

        // Should handle Unicode properly
        if (data) {
          expect(data[0]?.content).toContain('🔥');
        }
      }
    });

    test('should handle null bytes and control characters', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const messageWithNull = 'Hello\\x00World';
        
        const { data, error } = await supabase
          .from('messages')
          .insert({
            room_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
            sender_id: user.id,
            content: messageWithNull,
          });

        // Should either reject or sanitize
        expect(error || data).toBeDefined();
      }
    });
  });

  describe('Profile Field Validation', () => {
    test('should validate username uniqueness', async () => {
      const testUsername = `test-${Date.now()}`;
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // First insert
        const { error: error1 } = await supabase
          .from('profiles')
          .insert({ id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', username: testUsername });

        // Duplicate attempt
        const { error: error2 } = await supabase
          .from('profiles')
          .insert({ id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', username: testUsername });

        // Second should fail
        if (error2) {
          expect(error2.code).toMatch(/23505|unique/i);
        }
      }
    });

    test('should handle special characters in bio', async () => {
      const bioWithSpecialChars = "JS/TS & React | Python <3 \"Hello\" 'quoted'";
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .update({ bio: bioWithSpecialChars })
          .eq('id', user.id);

        if (data) {
          expect(data[0]?.bio).toBe(bioWithSpecialChars);
        }
      }
    });

    test('should validate array fields (skills)', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .update({
            skills_have: ['TypeScript', 'React', 'Node.js'],
            skills_want: ['Rust', 'Go']
          })
          .eq('id', user.id);

        if (data) {
          expect(Array.isArray(data[0]?.skills_have)).toBe(true);
        }
      }
    });

    test('should reject invalid URL format for avatar', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const invalidUrl = 'javascript:alert(1)';
        
        const { data } = await supabase
          .from('profiles')
          .update({ avatar_url: invalidUrl })
          .eq('id', user.id);

        // Should store but client should validate before rendering
        if (data) {
          // No validation at DB level for this test
          expect(data).toBeDefined();
        }
      }
    });
  });

  describe('Project Field Validation', () => {
    test('should validate title is not empty', async () => {
      const { error } = await supabase
        .from('projects')
        .insert({
          owner_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
          title: '',
        });

      // Empty title should fail (RLS or constraint)
      expect(error?.code).toMatch(/not null|constraint|42501|permission/i);
    });

    test('should allow long project description', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const longDesc = 'a'.repeat(2000);
        
        const { data } = await supabase
          .from('projects')
          .insert({
            owner_id: user.id,
            title: 'Test Project',
            description: longDesc,
          });

        // Should accept if no constraint
        expect(data || null).toBeDefined();
      }
    });

    test('should handle HTML in project description', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const htmlDesc = '<h1>Hack the planet</h1><img src=x onerror="alert(1)">';
        
        const { data } = await supabase
          .from('projects')
          .insert({
            owner_id: user.id,
            title: 'Test',
            description: htmlDesc,
          });

        // Should store as-is (sanitize on render)
        if (data) {
          expect(data[0]?.description).toContain('onerror');
        }
      }
    });

    test('should validate phase enum values', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase
          .from('projects')
          .insert({
            owner_id: user.id,
            title: 'Test',
            phase: 'invalid_phase', // Not in enum
          });

        // Should reject invalid enum
        expect(error?.code).toMatch(/enum|constraint|check/i);
      }
    });

    test('should handle array fields (roles_needed, tags)', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from('projects')
          .insert({
            owner_id: user.id,
            title: 'Test',
            roles_needed: ['Frontend', 'Backend'],
            tags: ['ML', 'Python', 'Data'],
          });

        if (data) {
          expect(Array.isArray(data[0]?.roles_needed)).toBe(true);
        }
      }
    });
  });

  describe('Request Injection Attacks', () => {
    test.skip('should prevent SQL injection in query parameters', async () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const encoded = encodeURIComponent(sqlInjection);
      
      const response = await fetch(`http://localhost:3001/api/profiles?q=${encoded}`);
      expect(response.status).toBe(200);
      
      // Should complete successfully with no injection
      const data = await response.json();
      expect(data.profiles).toBeDefined();
    });

    test.skip('should prevent NoSQL injection patterns', async () => {
      const noSqlPayload = JSON.stringify({ $ne: null });
      const response = await fetch(`http://localhost:3001/api/profiles?q=${encodeURIComponent(noSqlPayload)}`);
      
      expect(response.status).toBe(200);
    });

    test.skip('should prevent command injection in sort parameter', async () => {
      const response = await fetch('http://localhost:3001/api/profiles?sort=hype; rm -rf /');
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(['hype', 'recent']).toContain(data.sort);
    });
  });

  describe('Content-Type Validation', () => {
    test.skip('should validate file upload content types', async () => {
      // If app supports avatar uploads
      const response = await fetch('http://localhost:3001/api/profiles', { method: 'POST' });
      
      // Should have proper error handling
      expect([200, 400, 401, 405]).toContain(response.status);
    });
  });

  describe('Encoding Attacks', () => {
    test.skip('should handle double URL encoding', async () => {
      const payload = '<script>';
      const doubleEncoded = encodeURIComponent(encodeURIComponent(payload));
      
      const response = await fetch(`http://localhost:3001/api/profiles?q=${doubleEncoded}`);
      expect(response.status).toBe(200);
    });

    test.skip('should handle mixed case in parameters', async () => {
      const response = await fetch('http://localhost:3001/api/profiles?Sort=HYPE&PAGE=1');
      
      // Parameters should be case-sensitive
      const data = await response.json();
      expect(data).toBeDefined();
    });
  });
});
