#!/usr/bin/env node

/**
 * 構建後腳本：將帶哈希的類型文件重命名為穩定名稱，並更新 package.json
 * 
 * 這個腳本解決了 tsdown 生成帶哈希的類型文件名稱的問題。
 * 它會：
 * 1. 找到 dist 目錄中所有帶哈希的類型文件
 * 2. 將它們重命名為穩定的名稱（index.d.ts 或 index.d.cts）
 * 3. 更新 package.json 中的 types 欄位和 exports.types
 */

import { readdir, rename, readFile, writeFile, access, stat, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function findTypeFiles(distDir) {
  try {
    const files = await readdir(distDir);
    const typeFiles = files.filter(file => {
      // 匹配格式：index-<hash>.d.ts, index-<hash>.d.cts, 或 index-<hash>.d.mts
      return /^index-[A-Za-z0-9_-]+\.d\.(ts|cts|mts)$/.test(file);
    });
    return typeFiles;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []; // dist 目錄不存在，返回空數組
    }
    throw error;
  }
}

async function updatePackageJson(packageJsonPath, dtsFile, dctsFile, dmtsFile) {
  const content = await readFile(packageJsonPath, 'utf-8');
  const pkg = JSON.parse(content);
  
  // 決定使用哪個類型文件作為主要的 types 欄位
  // 優先順序：.d.cts > .d.mts > .d.ts
  let stableTypeFile;
  if (dctsFile) {
    stableTypeFile = './dist/index.d.cts';
  } else if (dmtsFile) {
    stableTypeFile = './dist/index.d.mts';
  } else if (dtsFile) {
    stableTypeFile = './dist/index.d.ts';
  } else {
    return; // 沒有找到任何類型文件
  }
  
  // 更新根層級的 types 欄位
  pkg.types = stableTypeFile;
  
  // 更新 exports 欄位中的 types
  if (pkg.exports) {
    if (typeof pkg.exports === 'object' && !Array.isArray(pkg.exports)) {
      if (pkg.exports['.']) {
        if (typeof pkg.exports['.'] === 'object' && !Array.isArray(pkg.exports['.'])) {
          pkg.exports['.'].types = stableTypeFile;
        }
      }
    }
  }
  
  await writeFile(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
}

async function fixTypes(packageDir) {
  const distDir = join(packageDir, 'dist');
  const packageJsonPath = join(packageDir, 'package.json');
  
  const typeFiles = await findTypeFiles(distDir);
  
  if (typeFiles.length === 0) {
    console.log(`[skip] ${packageDir}: 未找到類型文件`);
    return;
  }
  
  let dtsFile = null;
  let dctsFile = null;
  let dmtsFile = null;
  
  for (const typeFile of typeFiles) {
    const oldPath = join(distDir, typeFile);
    let newName;
    if (typeFile.endsWith('.d.cts')) {
      newName = 'index.d.cts';
      dctsFile = newName;
    } else if (typeFile.endsWith('.d.mts')) {
      newName = 'index.d.mts';
      dmtsFile = newName;
    } else {
      newName = 'index.d.ts';
      dtsFile = newName;
    }
    const newPath = join(distDir, newName);
    
    // 檢查目標文件是否已存在且不同
    try {
      try {
        await access(newPath);
        // 文件已存在，檢查是否與當前文件相同
        const oldStat = await stat(oldPath);
        const newStat = await stat(newPath);
        if (oldStat.ino !== newStat.ino) {
          // 不同文件，刪除舊的
          await unlink(newPath);
        } else {
          // 相同文件，跳過
          continue;
        }
      } catch {
        // 文件不存在，繼續重命名
      }
      
      // 重命名類型文件
      await rename(oldPath, newPath);
      console.log(`[rename] ${typeFile} -> ${newName}`);
      
      // 同時重命名對應的 sourcemap 文件（如果存在）
      const sourcemapOldPath = oldPath + '.map';
      const sourcemapNewPath = newPath + '.map';
      try {
        await rename(sourcemapOldPath, sourcemapNewPath);
        console.log(`[rename] ${typeFile}.map -> ${newName}.map`);
      } catch (error) {
        // sourcemap 文件可能不存在，忽略錯誤
      }
    } catch (error) {
      console.error(`[error] 無法重命名 ${typeFile}:`, error.message);
      continue;
    }
  }
  
  // 更新 package.json
  try {
    await updatePackageJson(packageJsonPath, dtsFile, dctsFile, dmtsFile);
    console.log(`[update] ${packageJsonPath}`);
  } catch (error) {
    console.error(`[error] 無法更新 package.json:`, error.message);
  }
}

// 主函數
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('用法: node scripts/fix-types.js <package-dir>');
    console.error('範例: node scripts/fix-types.js packages/utils');
    process.exit(1);
  }
  
  const packageDir = args[0];
  await fixTypes(packageDir);
}

main().catch(error => {
  console.error('[fatal]', error);
  process.exit(1);
});
