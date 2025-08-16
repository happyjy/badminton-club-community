import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const SCHEMA_DIR = join(__dirname, 'schema');
const OUTPUT_FILE = join(__dirname, 'schema.prisma');

// 스키마 파일들의 순서를 지정 (의존성 순서 고려)
const schemaFiles = [
  '_base.prisma',
  'enums.prisma',
  //
  'user.prisma',
  'club.prisma',
  'workout.prisma',
  'guest.prisma',
  'clubCustomSetting.prisma',
  'phoneVerification.prisma',
  'smsNotificationLog.prisma',
];

let finalSchema = '';

// 각 파일의 내용을 순서대로 합침
schemaFiles.forEach((filename) => {
  const content = readFileSync(join(SCHEMA_DIR, filename), 'utf-8');
  finalSchema += content + '\n\n';
});

// 최종 schema.prisma 파일 생성
writeFileSync(OUTPUT_FILE, finalSchema);

console.log('Schema built successfully!');
