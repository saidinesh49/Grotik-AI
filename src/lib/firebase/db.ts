import { db } from './firebase';
import { collection, doc, getDoc, getDocs, query, where, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// Course types
export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  topics: string[];
  modules: Module[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  duration: string;
  lessons: Lesson[];
  order: number;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string;
  duration: string;
  order: number;
  hasQuiz: boolean;
  quizId?: string;
}

// Quiz types
export interface Quiz {
  id: string;
  title: string;
  description: string;
  courseId: string;
  lessonId?: string;
  questions: Question[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correct: string;
  explanation?: string;
}

// User progress types
export interface UserProgress {
  userId: string;
  courseId: string;
  completedLessons: string[];
  completedQuizzes: string[];
  lastAccessed: Date;
  progress: number;
}

// Course functions
export async function getCourses(): Promise<Course[]> {
  const coursesRef = collection(db, 'courses');
  const snapshot = await getDocs(coursesRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  const courseRef = doc(db, 'courses', courseId);
  const courseDoc = await getDoc(courseRef);
  
  if (!courseDoc.exists()) {
    return null;
  }
  
  return { id: courseDoc.id, ...courseDoc.data() } as Course;
}

export async function getCoursesByLevel(level: string): Promise<Course[]> {
  const coursesRef = collection(db, 'courses');
  const q = query(coursesRef, where('level', '==', level));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
}

// Quiz functions
export async function getQuizzes(): Promise<Quiz[]> {
  const quizzesRef = collection(db, 'quizzes');
  const snapshot = await getDocs(quizzesRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
}

export async function getQuizById(quizId: string): Promise<Quiz | null> {
  const quizRef = doc(db, 'quizzes', quizId);
  const quizDoc = await getDoc(quizRef);
  
  if (!quizDoc.exists()) {
    return null;
  }
  
  return { id: quizDoc.id, ...quizDoc.data() } as Quiz;
}

export async function getQuizzesByCourseId(courseId: string): Promise<Quiz[]> {
  const quizzesRef = collection(db, 'quizzes');
  const q = query(quizzesRef, where('courseId', '==', courseId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
}

// User progress functions
export async function getUserProgress(userId: string, courseId: string): Promise<UserProgress | null> {
  const progressRef = doc(db, 'userProgress', `${userId}_${courseId}`);
  const progressDoc = await getDoc(progressRef);
  
  if (!progressDoc.exists()) {
    return null;
  }
  
  return { userId, courseId, ...progressDoc.data() } as UserProgress;
}

export async function updateUserProgress(progress: UserProgress): Promise<void> {
  const progressRef = doc(db, 'userProgress', `${progress.userId}_${progress.courseId}`);
  await updateDoc(progressRef, {
    ...progress,
    lastAccessed: new Date()
  });
}

export async function markLessonComplete(userId: string, courseId: string, lessonId: string): Promise<void> {
  const progressRef = doc(db, 'userProgress', `${userId}_${courseId}`);
  const progressDoc = await getDoc(progressRef);
  
  if (!progressDoc.exists()) {
    // Create new progress document
    await addDoc(collection(db, 'userProgress'), {
      userId,
      courseId,
      completedLessons: [lessonId],
      completedQuizzes: [],
      lastAccessed: new Date(),
      progress: 0
    });
    return;
  }
  
  const progress = progressDoc.data() as UserProgress;
  if (!progress.completedLessons.includes(lessonId)) {
    progress.completedLessons.push(lessonId);
    
    // Calculate progress percentage
    const course = await getCourseById(courseId);
    if (course) {
      const totalLessons = course.modules.reduce((total, module) => total + module.lessons.length, 0);
      progress.progress = (progress.completedLessons.length / totalLessons) * 100;
    }
    
    await updateUserProgress(progress);
  }
}

export async function markQuizComplete(userId: string, courseId: string, quizId: string): Promise<void> {
  const progressRef = doc(db, 'userProgress', `${userId}_${courseId}`);
  const progressDoc = await getDoc(progressRef);
  
  if (!progressDoc.exists()) {
    // Create new progress document
    await addDoc(collection(db, 'userProgress'), {
      userId,
      courseId,
      completedLessons: [],
      completedQuizzes: [quizId],
      lastAccessed: new Date(),
      progress: 0
    });
    return;
  }
  
  const progress = progressDoc.data() as UserProgress;
  if (!progress.completedQuizzes.includes(quizId)) {
    progress.completedQuizzes.push(quizId);
    await updateUserProgress(progress);
  }
} 