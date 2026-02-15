const API_BASE = '';

class ApiClient {
    constructor() {
        this.baseURL = API_BASE;
    }

    getHeaders() {
        const token = localStorage.getItem('taskflow_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    }

    async request(method, url, body = null) {
        const options = {
            method,
            headers: this.getHeaders(),
        };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(`${this.baseURL}${url}`, options);
        const data = await response.json();

        if (!response.ok) {
            const error = new Error(data.error || 'Request failed');
            error.status = response.status;
            throw error;
        }

        return { data, status: response.status };
    }

    get(url) { return this.request('GET', url); }
    post(url, body) { return this.request('POST', url, body); }
    put(url, body) { return this.request('PUT', url, body); }
    delete(url) { return this.request('DELETE', url); }
}

const api = new ApiClient();
export default api;
