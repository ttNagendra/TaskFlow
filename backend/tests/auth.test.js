import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE = 'http://localhost:3001/api';

// These tests require the backend to be running
// Start with: npm run dev

let token = '';
const testUser = {
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    password: 'testpass123',
};

describe('Auth API', () => {
    it('should signup a new user', async () => {
        const res = await fetch(`${BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser),
        });
        const data = await res.json();
        expect(res.status).toBe(201);
        expect(data.token).toBeDefined();
        expect(data.user.email).toBe(testUser.email);
        token = data.token;
    });

    it('should reject duplicate email', async () => {
        const res = await fetch(`${BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser),
        });
        expect(res.status).toBe(409);
    });

    it('should login with correct credentials', async () => {
        const res = await fetch(`${BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testUser.email, password: testUser.password }),
        });
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data.token).toBeDefined();
        token = data.token;
    });

    it('should reject wrong password', async () => {
        const res = await fetch(`${BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testUser.email, password: 'wrongpass' }),
        });
        expect(res.status).toBe(401);
    });

    it('should access protected /me route', async () => {
        const res = await fetch(`${BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data.user.email).toBe(testUser.email);
    });

    it('should reject unauthenticated access', async () => {
        const res = await fetch(`${BASE}/auth/me`);
        expect(res.status).toBe(401);
    });
});

describe('Boards API', () => {
    let boardId;

    it('should create a board', async () => {
        const res = await fetch(`${BASE}/boards`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ title: 'Test Board', description: 'A test board' }),
        });
        const data = await res.json();
        expect(res.status).toBe(201);
        expect(data.board.title).toBe('Test Board');
        boardId = data.board.id;
    });

    it('should list boards', async () => {
        const res = await fetch(`${BASE}/boards`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data.boards.length).toBeGreaterThan(0);
    });

    it('should get board by id', async () => {
        const res = await fetch(`${BASE}/boards/${boardId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data.board.id).toBe(boardId);
    });

    it('should create a list', async () => {
        const res = await fetch(`${BASE}/lists/${boardId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ title: 'Test List' }),
        });
        const data = await res.json();
        expect(res.status).toBe(201);
        expect(data.list.title).toBe('Test List');
    });
});
