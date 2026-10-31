const fs = require('fs');
const path = require('path');

const srcDir = path.resolve('C:/Users/HP/.gemini/antigravity/brain/8d1670d6-f852-491a-8cd8-d855ea3f5100');
const destDir = path.resolve('d:/TAMARA/drogueria-eka/web-institucional/assets');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir);
files.forEach(file => {
  if (file.endsWith('.png')) {
    // Simplify name: take the part before the timestamp
    // e.g. hero_bg_1775763627285.png -> hero_bg.png
    const nameStr = file.split('_').slice(0, -1).join('_');
    const newName = nameStr ? `${nameStr}.png` : file;
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, newName));
    console.log(`Copied ${file} to ${newName}`);
  }
});
console.log('Copy complete.');
