#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔧 Applying TypeScript Best Practices...\n');

// 1. Run ESLint auto-fix
console.log('📝 Running ESLint auto-fix...');
try {
    execSync('npx eslint . --ext .ts,.tsx --fix', { stdio: 'inherit' });
    console.log('✅ ESLint fixes applied\n');
} catch {
    console.log('⚠️  Some ESLint issues require manual fixing\n');
}

// 2. Run Prettier
console.log('💅 Running Prettier...');
try {
    execSync('npx prettier --write "**/*.{ts,tsx,json}"', { stdio: 'inherit' });
    console.log('✅ Code formatted\n');
} catch {
    console.log('❌ Prettier failed\n');
}

// 3. Type check
console.log('🔍 Running TypeScript type check...');
try {
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    console.log('✅ No type errors found\n');
} catch {
    console.log('❌ Type errors detected. Please fix them manually.\n');
}

// 4. Check for common anti-patterns
console.log('🔎 Scanning for common anti-patterns...');
const srcDir = path.join(process.cwd(), 'src');

function scanFiles(dir) {
    if (!fs.existsSync(dir)) {
        console.log('⚠️  src directory not found\n');
        return;
    }

    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            scanFiles(filePath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            const content = fs.readFileSync(filePath, 'utf-8');

            // Check for 'any' type
            if (content.includes(': any')) {
                console.log(`⚠️  Found 'any' type in ${filePath}`);
            }

            // Check for console.log
            if (content.includes('console.log')) {
                console.log(`⚠️  Found console.log in ${filePath}`);
            }
        }
    });
}

scanFiles(srcDir);

console.log('\n✨ Best practices check complete!');
