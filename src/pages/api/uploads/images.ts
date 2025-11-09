import { supabase } from '@/lib/supabase';
import { withAuth } from '@/lib/session';
import { ApiResponse, ImageUploadResponse } from '@/types';

import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Fields, Files } from 'formidable';
import { readFileSync } from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<
    ApiResponse<'image', ImageUploadResponse> | { error: string; status: number }
  >
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 1,
    });

    const [fields, files]: [Fields, Files] = await new Promise(
      (resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          resolve([fields, files]);
        });
      }
    );

    const file = Array.isArray(files.image) ? files.image[0] : files.image;

    if (!file) {
      return res.status(400).json({
        error: '이미지 파일이 없습니다',
        status: 400,
      });
    }

    // 파일 타입 검증
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.mimetype || '')) {
      return res.status(415).json({
        error: '지원하지 않는 이미지 형식입니다. (jpg, png, webp만 가능)',
        status: 415,
      });
    }

    // 파일 읽기
    const fileBuffer = readFileSync(file.filepath);
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileName = `${req.user.id}_${timestamp}_${randomStr}.${file.mimetype?.split('/')[1]}`;
    const filePath = `awards/${fileName}`;

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from('images')
      .upload(filePath, fileBuffer, {
        contentType: file.mimetype || 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({
        error: '이미지 업로드에 실패했습니다',
        status: 500,
      });
    }

    // 공개 URL 가져오기
    const {
      data: { publicUrl },
    } = supabase.storage.from('images').getPublicUrl(filePath);

    return res.status(200).json({
      data: {
        image: {
          url: publicUrl,
          path: filePath,
        },
      },
      status: 200,
      message: '이미지가 성공적으로 업로드되었습니다',
    });
  } catch (error) {
    console.error('이미지 업로드 중 오류 발생:', error);
    return res.status(500).json({
      error: '이미지 업로드에 실패했습니다',
      status: 500,
    });
  }
}

export default withAuth(handler);

