const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = path.resolve(__dirname);
const files = [
  'index.html',
  'style.css',
  'app.js',
  'content.js',
  'sw.js',
  'manifest.webmanifest',
  'icon.svg',
  'package.json',
  'vercel.json',
  'README.md'
];

function copyFiles(destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  files.forEach(f => {
    const srcFile = path.join(srcDir, f);
    const destFile = path.join(destDir, f);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, destFile);
    }
  });
}

// 1. Target: Downloads
const dlDir = 'C:\\Users\\shaun\\Downloads\\bodywise-progress-companion';
const dlZip = 'C:\\Users\\shaun\\Downloads\\bodywise-progress-companion.zip';
copyFiles(dlDir);
console.log('Copied files to ' + dlDir);

try {
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${dlDir}\\*' -DestinationPath '${dlZip}' -Force"`);
  console.log('Created ' + dlZip);
} catch (e) {
  console.error('Failed to create zip at Downloads:', e.message);
}

// 2. Target: OneDrive/Desktop
const dtDir = 'C:\\Users\\shaun\\OneDrive\\Desktop\\bodywise-progress-companion';
const dtZip = 'C:\\Users\\shaun\\OneDrive\\Desktop\\bodywise-progress-companion.zip';
if (fs.existsSync('C:\\Users\\shaun\\OneDrive\\Desktop')) {
  copyFiles(dtDir);
  console.log('Copied files to ' + dtDir);
  try {
    execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${dtDir}\\*' -DestinationPath '${dtZip}' -Force"`);
    console.log('Created ' + dtZip);
  } catch (e) {
    console.error('Failed to create zip at Desktop:', e.message);
  }
}
