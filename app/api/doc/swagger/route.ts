import { NextResponse } from 'next/server';
import swaggerJsdoc from 'swagger-jsdoc';

export async function GET() {
  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Tarım Yönetim Sistemi API',
        version: '1.0.0',
        description: 'Bu API, Tarım Yönetim Sistemi projesinin backend servislerini sunar.',
      },
      servers: [
        {
          url: '/api',
          description: 'Geliştirme Sunucusu',
        },
      ],
    },
    apis: ['./app/api/**/route.ts', './app/api/**/docs.yaml'], // Yorumların ve YAML dosyalarının aranacağı yollar
  };

  const specs = swaggerJsdoc(options);

  return NextResponse.json(specs);
}
