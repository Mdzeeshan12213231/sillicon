const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');

class MediaService {
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    this.allowedAudioTypes = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/webm'];
    
    this.ensureUploadDir();
  }

  ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // Configure multer for file uploads
  getUploadConfig() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(this.uploadDir, file.fieldname);
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      }
    });

    const fileFilter = (req, file, cb) => {
      const allowedTypes = [...this.allowedVideoTypes, ...this.allowedAudioTypes, 'image/*'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type'), false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: this.maxFileSize
      }
    });
  }

  // Process video file and extract metadata
  async processVideo(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoInfo = {
          duration: metadata.format.duration,
          size: metadata.format.size,
          bitrate: metadata.format.bit_rate,
          resolution: null,
          fps: null
        };

        // Get video stream info
        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        if (videoStream) {
          videoInfo.resolution = `${videoStream.width}x${videoStream.height}`;
          videoInfo.fps = videoStream.r_frame_rate;
        }

        resolve(videoInfo);
      });
    });
  }

  // Generate video thumbnail
  async generateThumbnail(videoPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['50%'],
          filename: 'thumbnail.png',
          folder: path.dirname(outputPath),
          size: '320x240'
        })
        .on('end', () => {
          resolve(path.join(path.dirname(outputPath), 'thumbnail.png'));
        })
        .on('error', reject);
    });
  }

  // Convert audio to text using speech recognition
  async audioToText(audioPath, language = 'en-US') {
    try {
      // This would integrate with a speech recognition service like Google Speech-to-Text
      // For now, we'll return a placeholder
      return {
        text: "Audio transcription would be processed here",
        confidence: 0.95,
        language: language,
        duration: 0
      };
    } catch (error) {
      console.error('Error converting audio to text:', error);
      throw error;
    }
  }

  // Process voice message and create ticket
  async processVoiceMessage(audioFile, userId) {
    try {
      // Convert audio to text
      const transcription = await this.audioToText(audioFile.path);
      
      // Use AI to structure the voice input into ticket data
      const aiService = require('./aiService');
      const ticketData = await aiService.classifyTicket(
        'Voice Message',
        transcription.text
      );

      return {
        transcription,
        suggestedCategory: ticketData.category,
        suggestedPriority: ticketData.suggested_priority || 'medium',
        originalAudio: audioFile.filename
      };
    } catch (error) {
      console.error('Error processing voice message:', error);
      throw error;
    }
  }

  // Process video ticket
  async processVideoTicket(videoFile, userId) {
    try {
      // Process video metadata
      const videoInfo = await this.processVideo(videoFile.path);
      
      // Generate thumbnail
      const thumbnailPath = await this.generateThumbnail(
        videoFile.path,
        path.join(path.dirname(videoFile.path), 'thumbnails')
      );

      return {
        videoInfo,
        thumbnail: path.basename(thumbnailPath),
        duration: videoInfo.duration,
        resolution: videoInfo.resolution
      };
    } catch (error) {
      console.error('Error processing video ticket:', error);
      throw error;
    }
  }

  // Generate QR code for quick ticket creation
  async generateQRCode(ticketData) {
    try {
      const QRCode = require('qrcode');
      const qrData = {
        type: 'quick_ticket',
        category: ticketData.category || 'general',
        product: ticketData.product || 'general',
        timestamp: Date.now()
      };

      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return {
        qrCode: qrCodeDataURL,
        data: qrData
      };
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  // Clean up old files
  async cleanupOldFiles(daysOld = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      
      const files = await fs.promises.readdir(this.uploadDir, { withFileTypes: true });
      
      for (const file of files) {
        if (file.isDirectory()) {
          const subDir = path.join(this.uploadDir, file.name);
          const subFiles = await fs.promises.readdir(subDir, { withFileTypes: true });
          
          for (const subFile of subFiles) {
            const filePath = path.join(subDir, subFile.name);
            const stats = await fs.promises.stat(filePath);
            
            if (stats.mtime < cutoffDate) {
              await fs.promises.unlink(filePath);
              console.log(`Deleted old file: ${filePath}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old files:', error);
    }
  }

  // Get file URL
  getFileUrl(filename, type = 'attachments') {
    return `/uploads/${type}/${filename}`;
  }

  // Validate file type
  isValidFileType(mimetype, fileType = 'all') {
    const typeMap = {
      video: this.allowedVideoTypes,
      audio: this.allowedAudioTypes,
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      all: [...this.allowedVideoTypes, ...this.allowedAudioTypes, 'image/*']
    };

    const allowedTypes = typeMap[fileType] || typeMap.all;
    return allowedTypes.some(type => mimetype.includes(type.split('/')[0]));
  }

  // Get file size in human readable format
  formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = new MediaService();

