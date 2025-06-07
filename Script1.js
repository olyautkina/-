const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const url = require('url');
const querystring = require('querystring');

const PORT = 3000;

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'todolist',
};

async function retrieveListItems() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'SELECT id, text FROM items ORDER BY id';
        const [rows] = await connection.execute(query);
        await connection.end();
        return rows;
    } catch (error) {
        console.error('Error retrieving list items:', error);
        throw error;
    }
}

async function addListItem(text) {
    const connection = await mysql.createConnection(dbConfig);
    const query = 'INSERT INTO items (text) VALUES (?)';
    await connection.execute(query, [text]);
    await connection.end();
}

async function deleteListItem(id) {
    const connection = await mysql.createConnection(dbConfig);
    const query = 'DELETE FROM items WHERE id = ?';
    await connection.execute(query, [id]);
    await connection.end();
}

async function updateListItem(id, newText) {
    const connection = await mysql.createConnection(dbConfig);
    const query = 'UPDATE items SET text = ? WHERE id = ?';
    await connection.execute(query, [newText, id]);
    await connection.end();
}

async function getHtmlRows() {
    const todoItems = await retrieveListItems();
    return todoItems.map(item => `
        <tr data-id="${item.id}">
            <td>${item.id}</td>
            <td class="item-text">${item.text}</td>
            <td>
                <button class="edit-btn" onclick="editItem(${item.id})">Edit</button>
                <button class="delete-btn" onclick="removeItem(${item.id})">×</button>
            </td>
        </tr>
    `).join('');
}

async function handleRequest(req, res) {
    const parsedUrl = url.parse(req.url);
    const path = parsedUrl.pathname;

    if (path === '/') {
        try {
            const html = await fs.promises.readFile(
                path.join(__dirname, 'index.html'), 
                'utf8'
            );
            const processedHtml = html.replace('{{rows}}', await getHtmlRows());
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);
        } catch (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading index.html');
        }
    } 
    else if (path === '/add' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            const { text } = querystring.parse(body);
            await addListItem(text);
            res.writeHead(302, { 'Location': '/' });
            res.end();
        });
    }
    else if (path === '/delete' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            const { id } = querystring.parse(body);
            await deleteListItem(id);
            res.writeHead(302, { 'Location': '/' });
            res.end();
        });
    }
    else if (path === '/update' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            const { id, newText } = querystring.parse(body);
            await updateListItem(id, newText);
            res.writeHead(302, { 'Location': '/' });
            res.end();
        });
    }
    else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Route not found');
    }
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
