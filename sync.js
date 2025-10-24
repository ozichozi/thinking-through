const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const fs = require('fs').promises;
const marked = require('marked');

async function syncNotion() {
   try {
       console.log('Starting sync...');
       const notion = new Client({ auth: process.env.NOTION_API_KEY });
       const n2m = new NotionToMarkdown({ notionClient: notion });

       console.log('Querying database...');
       const pages = await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID,
        filter: {
            property: 'status',
            select: {           
                equals: 'Published'
            }
        }
    });

       console.log(`Found ${pages.results.length} published pages`);
       const posts = [];

       for (const page of pages.results) {
           try {
               console.log(`Processing page: ${page.id}`);
               const title = page.properties.Name.title[0].plain_text;
               const slug = page.properties.Slug.rich_text[0].plain_text;
               
               console.log(`Title: ${title}, Slug: ${slug}`);
               
               const mdBlocks = await n2m.pageToMarkdown(page.id);
               const markdown = n2m.toMarkdownString(mdBlocks).parent;
               console.log('Generated markdown');
               
               const html = `<!DOCTYPE html>
<html>
<head>
   <meta charset="UTF-8">
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   <title>${title}</title>
   <style>
       :root {
           --bg-color: #fff;
           --text-color: #333;
           --accent-color: #666;
       }
       
       @media (prefers-color-scheme: dark) {
           :root {
               --bg-color: #1a1a1a;
               --text-color: #e5e5e5;
               --accent-color: #a0a0a0;
           }
       }
       
       [data-theme="dark"] {
           --bg-color: #1a1a1a;
           --text-color: #e5e5e5;
           --accent-color: #a0a0a0;
       }
       
       [data-theme="light"] {
           --bg-color: #fff;
           --text-color: #333;
           --accent-color: #666;
       }
       
       * { transition: background-color 0.3s ease, color 0.3s ease; }
       
       body {
           font-family: -apple-system, system-ui, sans-serif;
           line-height: 1.6;
           max-width: 650px;
           margin: 40px auto;
           padding: 0 10px;
           color: var(--text-color);
           background: var(--bg-color);
       }
       
       a { color: var(--text-color); }
       
       img {
           max-width: 100%;
           height: auto;
           display: block;
           margin: 20px auto;
           border-radius: 8px;
           loading: lazy;
       }
       
       .theme-toggle {
           position: fixed;
           top: 20px;
           right: 20px;
           background: var(--bg-color);
           border: 1px solid var(--accent-color);
           color: var(--text-color);
           padding: 8px 12px;
           border-radius: 6px;
           cursor: pointer;
           font-size: 14px;
       }
       
       .theme-toggle:hover {
           opacity: 0.8;
       }
       
       pre {
           background: var(--accent-color);
           color: var(--bg-color);
           padding: 16px;
           border-radius: 6px;
           overflow-x: auto;
       }
       
       code {
           background: var(--accent-color);
           color: var(--bg-color);
           padding: 2px 6px;
           border-radius: 3px;
           font-size: 0.9em;
       }
       
       blockquote {
           border-left: 3px solid var(--accent-color);
           margin: 0;
           padding-left: 20px;
           font-style: italic;
           color: var(--accent-color);
       }
   </style>
</head>
<body>
   <button class="theme-toggle" onclick="toggleTheme()">◑</button>
   <a href="./">← Back</a>
   <h1>${title}</h1>
   ${marked.parse(markdown)}
   <div style="margin-top: 40px; color: var(--accent-color);">
       Last updated: ${new Date().toLocaleDateString()}
   </div>
   
   <script>
       function toggleTheme() {
           const current = document.documentElement.getAttribute('data-theme');
           const next = current === 'dark' ? 'light' : 'dark';
           document.documentElement.setAttribute('data-theme', next);
           localStorage.setItem('theme', next);
       }
       
       // Initialize theme
       const saved = localStorage.getItem('theme');
       if (saved) {
           document.documentElement.setAttribute('data-theme', saved);
       } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
           document.documentElement.setAttribute('data-theme', 'dark');
       }
       
       // Listen for system theme changes
       window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
           if (!localStorage.getItem('theme')) {
               document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
           }
       });
   </script>
</body>
</html>`;

               console.log(`Writing ${slug}.html`);
               await fs.writeFile(`${slug}.html`, html);
               posts.push({ 
                   title, 
                   slug,
                   date: new Date().toLocaleDateString() 
               });
               console.log(`Processed ${title}`);
           } catch (error) {
               console.error(`Error processing page ${page.id}:`, error);
           }
       }

       console.log('Writing posts.json');
       await fs.writeFile('posts.json', JSON.stringify(posts, null, 2));
       console.log('Sync completed successfully');
   } catch (error) {
       console.error('Sync failed:', error);
       throw error;
   }
}

syncNotion().catch(console.error);