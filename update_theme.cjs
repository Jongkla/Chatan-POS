const fs = require('fs');
['src/App.tsx', 'src/pages/POS.tsx', 'src/pages/AdminDashboard.tsx', 'src/pages/Login.tsx'].forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/neutral/g, 'slate');
  fs.writeFileSync(f, content, 'utf8');
});
