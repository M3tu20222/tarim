const fs = require('fs');
const path = require('path');

// Oluşturulacak dosya ve klasör yapısı
const projectStructure = [
  'components/purchases/purchases-table.tsx',
  'components/purchases/purchase-details.tsx',
  'components/purchases/purchase-actions.tsx'
];

// Boş dosya içerikleri
const templates = {
  'route.ts': `import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "API route working" });
}
`,
  'page.tsx': `export default function Page() {
  return <div>New page</div>;
}
`,
  'component.tsx': `"use client";

export function Component() {
  return <div>Component</div>;
}
`
};

// Ana işlem fonksiyonu
function createProjectStructure() {
  projectStructure.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);
    
    // Klasör yolu kontrolü
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Klasör oluşturuldu: ${dir}`);
    }

    // Dosya kontrolü
    if (!fs.existsSync(fullPath)) {
      const ext = path.extname(filePath);
      const templateType = ext === '.tsx' ? 'component.tsx' : 'route.ts';
      fs.writeFileSync(fullPath, templates[templateType]);
      console.log(`Dosya oluşturuldu: ${fullPath}`);
    } else {
      console.log(`Dosya zaten var: ${fullPath}`);
    }
  });
}

// Script'i çalıştır
createProjectStructure();
console.log('İşlem tamamlandı!');