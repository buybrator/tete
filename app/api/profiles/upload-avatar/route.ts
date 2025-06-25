import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface StorageFile {
  name: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const walletAddress = formData.get('wallet_address') as string;

    console.log('📤 아바타 업로드 요청:', { 
      fileName: file?.name, 
      fileSize: file?.size, 
      fileType: file?.type,
      walletAddress 
    });

    if (!file) {
      console.error('❌ 파일이 제공되지 않음');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!walletAddress) {
      console.error('❌ 지갑 주소가 누락됨');
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // 파일 확장자 체크
    const fileType = file.type;
    if (!fileType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // 파일 크기 체크 (5MB 제한)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // 파일명 생성 (지갑주소_타임스탬프.확장자)
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${walletAddress}_${Date.now()}.${fileExtension}`;
    const filePath = `avatars/${fileName}`;

    // 파일을 ArrayBuffer로 변환
    const fileBuffer = await file.arrayBuffer();

    // 기존 아바타 파일 삭제 (선택적)
    try {
      const { data: existingFiles } = await supabaseAdmin.storage
        .from('avatars')
        .list('', {
          search: walletAddress
        });
      
      if (existingFiles && existingFiles.length > 0) {
        // 기존 파일들 삭제
        const filesToDelete = existingFiles
          .filter((f: StorageFile) => f.name.startsWith(walletAddress))
          .map((f: StorageFile) => `avatars/${f.name}`);
        
        if (filesToDelete.length > 0) {
          await supabaseAdmin.storage.from('avatars').remove(filesToDelete);
        }
      }
    } catch (cleanupError) {
      console.warn('Failed to cleanup old avatar files:', cleanupError);
      // 기존 파일 삭제 실패는 무시하고 계속 진행
    }

    // Supabase Storage에 파일 업로드
    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, fileBuffer, {
        contentType: fileType,
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    // 공개 URL 생성
    const { data: urlData } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    console.log('✅ 아바타 업로드 성공:', { publicUrl, filePath });

    return NextResponse.json({
      success: true,
      avatar_url: publicUrl,
      file_path: filePath
    });

  } catch (error) {
    console.error('❌ Avatar upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 