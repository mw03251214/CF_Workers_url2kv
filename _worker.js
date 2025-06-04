let mytoken = 'passwd';

export default {
    async fetch(request, env) {
        try {
            mytoken = env.TOKEN || mytoken;

            if (!env.KV) {
                throw new Error('KV 命名空间未绑定');
            }

            const url = new URL(request.url);
            const token = url.searchParams.get('token') || "null";

            if (token !== mytoken) {
                return createResponse(nginxHTML(), 403, { 'Content-Type': 'text/html; charset=UTF-8' });
            }

            const path = url.pathname.toLowerCase();
            
            if (path === '/api/save') {
                const data = await request.json();
                const { type, index, url, description } = data;
                await env.KV.put(`${type}_${index}`, JSON.stringify({ url, description }));
                return createResponse(JSON.stringify({ success: true }));
            }
            
            if (path === '/api/get') {
                const data = await request.json();
                const { type } = data;
                const result = {};
                for (let i = 0; i < 5; i++) {
                    const value = await env.KV.get(`${type}_${i}`);
                    if (value) {
                        result[i] = JSON.parse(value);
                    }
                }
                return createResponse(JSON.stringify(result));
            }

            return createResponse(mainHTML(url.hostname, token), 200, { 'Content-Type': 'text/html; charset=UTF-8' });
        } catch (error) {
            console.error("Error:", error);
            return createResponse(`Error: ${error.message}`, 500);
        }
    }
};

function createResponse(body, status = 200, additionalHeaders = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...additionalHeaders
    };
    return new Response(body, { status, headers });
}

function nginxHTML() {
    return `
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
html { color-scheme: light dark; }
body { width: 35em; margin: 0 auto; font-family: Tahoma, Verdana, Arial, sans-serif; }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and working.</p>
</body>
</html>
    `;
}

function mainHTML(domain, token) {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>URL 管理器</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { margin-bottom: 30px; }
        .url-group { margin-bottom: 15px; display: flex; gap: 10px; }
        input[type="text"] { flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        button { padding: 8px 15px; border: none; border-radius: 4px; cursor: pointer; background: #4a90e2; color: white; }
        button:hover { background: #357abd; }
        h2 { color: #333; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>URL 链接管理</h2>
        <div id="urlContainer"></div>
    </div>
    
    <div class="container">
        <h2>URL Scheme 管理</h2>
        <div id="schemeContainer"></div>
    </div>

    <script>
        const API_BASE = '';
        const token = '${token}';

        function generateUrlGroups() {
            const urlContainer = document.getElementById('urlContainer');
            const schemeContainer = document.getElementById('schemeContainer');
            
            for (let i = 0; i < 5; i++) {
                const urlGroup = document.createElement('div');
                urlGroup.className = 'url-group';
                urlGroup.innerHTML = \`
                    <input type="text" id="urlDesc\${i}" placeholder="URL 描述">
                    <input type="text" id="url\${i}" placeholder="输入 URL">
                    <button onclick="saveUrl(\${i})">保存</button>
                    <button onclick="openUrl(\${i})">跳转</button>
                \`;
                urlContainer.appendChild(urlGroup);

                const schemeGroup = document.createElement('div');
                schemeGroup.className = 'url-group';
                schemeGroup.innerHTML = \`
                    <input type="text" id="schemeDesc\${i}" placeholder="URL Scheme 描述">
                    <input type="text" id="scheme\${i}" placeholder="输入 URL Scheme">
                    <button onclick="saveScheme(\${i})">保存</button>
                    <button onclick="openScheme(\${i})">跳转</button>
                \`;
                schemeContainer.appendChild(schemeGroup);
            }
        }

        async function saveUrl(index) {
            const url = document.getElementById(\`url\${index}\`).value.trim();
            const description = document.getElementById(\`urlDesc\${index}\`).value.trim();
            if (url) {
                try {
                    const response = await fetch(\`\${API_BASE}/api/save\`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'url',
                            index,
                            url,
                            description
                        })
                    });
                    if (response.ok) {
                        alert('保存成功');
                    }
                } catch (error) {
                    alert('保存失败');
                }
            }
        }

        async function saveScheme(index) {
            const url = document.getElementById(\`scheme\${index}\`).value.trim();
            const description = document.getElementById(\`schemeDesc\${index}\`).value.trim();
            if (url) {
                try {
                    const response = await fetch(\`\${API_BASE}/api/save\`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'scheme',
                            index,
                            url,
                            description
                        })
                    });
                    if (response.ok) {
                        alert('保存成功');
                    }
                } catch (error) {
                    alert('保存失败');
                }
            }
        }

        async function openUrl(index) {
            try {
                const response = await fetch(\`\${API_BASE}/api/get\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'url' })
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data[index] && data[index].url) {
                        window.open(data[index].url, '_blank');
                    }
                }
            } catch (error) {
                alert('获取失败');
            }
        }

        async function openScheme(index) {
            try {
                const response = await fetch(\`\${API_BASE}/api/get\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'scheme' })
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data[index] && data[index].url) {
                        window.location.href = data[index].url;
                    }
                }
            } catch (error) {
                alert('获取失败');
            }
        }

        async function loadSavedData() {
            try {
                const urlResponse = await fetch(\`\${API_BASE}/api/get\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'url' })
                });
                if (urlResponse.ok) {
                    const data = await urlResponse.json();
                    for (const [index, item] of Object.entries(data)) {
                        document.getElementById(\`url\${index}\`).value = item.url || '';
                        document.getElementById(\`urlDesc\${index}\`).value = item.description || '';
                    }
                }

                const schemeResponse = await fetch(\`\${API_BASE}/api/get\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'scheme' })
                });
                if (schemeResponse.ok) {
                    const data = await schemeResponse.json();
                    for (const [index, item] of Object.entries(data)) {
                        document.getElementById(\`scheme\${index}\`).value = item.url || '';
                        document.getElementById(\`schemeDesc\${index}\`).value = item.description || '';
                    }
                }
            } catch (error) {
                console.error('加载数据失败:', error);
            }
        }

        generateUrlGroups();
        loadSavedData();
    </script>
</body>
</html>
    `;
}
