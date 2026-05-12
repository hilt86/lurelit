import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/elastic';

export async function POST() {
  const result = await testConnection();
  return NextResponse.json(result);
}

export async function GET() {
  const result = await testConnection();
  return NextResponse.json(result);
}
