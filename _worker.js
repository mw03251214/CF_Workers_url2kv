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

                // 创建一个包含所有键的数组
                const keys = Array.from({ length: 5 }, (_, i) => `${type}_${i}`);

                // 并行获取所有数据
                const values = await Promise.all(
                    keys.map(async (key, index) => {
                        const value = await env.KV.get(key);
                        return { index, value };
                    })
                );

                // 处理结果
                values.forEach(({ index, value }) => {
                    if (value) {
                        result[index] = JSON.parse(value);
                    }
                });

                return createResponse(JSON.stringify(result));
            }

            if (token !== mytoken) {
                return createResponse(nginxHTML(), 403, { 'Content-Type': 'text/html; charset=UTF-8' });
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

        // 先加载数据，再生成UI
        async function initialize() {
            try {
                // 并行加载所有数据
                const [urlData, schemeData] = await Promise.all([
                    (async () => {
                        const response = await fetch(\`\${API_BASE}/api/get\`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type: 'url' })
                        });
                        return response.ok ? await response.json() : {};
                    })(),
                    (async () => {
                        const response = await fetch(\`\${API_BASE}/api/get\`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type: 'scheme' })
                        });
                        return response.ok ? await response.json() : {};
                    })()
                ]);

                // 生成 UI
                generateUrlGroups();

                // 填充数据
                Object.entries(urlData).forEach(([index, item]) => {
                    if (item) {
                        document.getElementById(\`url\${index}\`).value = item.url || '';
                        document.getElementById(\`urlDesc\${index}\`).value = item.description || '';
                    }
                });

                Object.entries(schemeData).forEach(([index, item]) => {
                    if (item) {
                        document.getElementById(\`scheme\${index}\`).value = item.url || '';
                        document.getElementById(\`schemeDesc\${index}\`).value = item.description || '';
                    }
                });
            } catch (error) {
                console.error('初始化失败:', error);
                generateUrlGroups();
            }
        }

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

        function openUrl(index) {
            let url = document.getElementById(\`url\${index}\`).value.trim();
            if (!url) {
                alert('URL不能为空');
                return;
            }
            // 如果URL不包含协议前缀，添加https://
            if (!/^https?:\\/\\//i.test(url)) {
                url = 'https://' + url;
            }
            console.log('打开 URL:', url);
            window.open(url, '_blank');
        }

        function openScheme(index) {
            const scheme = document.getElementById(\`scheme\${index}\`).value.trim();
            if (!scheme) {
                alert('URL Scheme不能为空');
                return;
            }
            window.location.href = scheme;
        }

        // 启动初始化
        initialize();
    </script>
</body>
</html>
    `;
}
