const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const p = path.join(dir, f);
    try {
      if (fs.statSync(p).isDirectory()) {
        if (!p.includes('profile')) {
          walk(p);
        }
      } else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
        let c = fs.readFileSync(p, 'utf8');
        if (c.includes('"/profile"')) {
          fs.writeFileSync(p, c.replace(/"\/profile"/g, '"/dashboard"'));
          console.log('Replaced in ' + p);
        }
      }
    } catch(e) {}
  }
}

walk('src');
