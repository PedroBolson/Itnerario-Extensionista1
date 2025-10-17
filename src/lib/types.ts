export type UserRole = 'admin' | 'user';

export interface UserRecord {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Topic {
  id: string;
  name: string;
  order?: number;
  coverImageUrl?: string;
  coverImageAlt?: string;
  category?: string;
  color?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Content {
  id: string;
  topicId: string;
  title: string;
  description?: string;
  order?: number;
  coverImageUrl?: string;
  coverImageAlt?: string;
  estimatedDuration?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Lesson {
  id: string;
  contentId: string;
  title: string;
  youtubeUrl: string;
  order?: number;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ParticipantRecord {
  code: string;
  displayName?: string;
  createdAt: Date;
  lastActiveAt?: Date;
}

export interface LearningProgress {
  id: string;
  participantId: string;
  lessonId: string;
  contentId?: string;
  topicId?: string;
  lastPosition: number;
  duration: number;
  completed: boolean;
  updatedAt: Date;
  completedAt?: Date;
}

