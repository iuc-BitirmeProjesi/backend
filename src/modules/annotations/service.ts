import type { LibSQLDatabase } from 'drizzle-orm/libsql/driver-core';
import { annotations,users } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

//get all annotations with userId
export const getAnnotations = async (
    db: LibSQLDatabase,
    userId: number
) => {
    try {
        const result = await db
            .select()
            .from(annotations)
            .where(eq(annotations.userId, userId))
            .orderBy(desc(annotations.createdAt))
            .all();
        return { data: result, success: true };
    } catch (error) {
        console.error('Error getting annotations:', error);
        return { error: 'Failed to retrieve annotations', success: false };
    }
}

//get annotation by id
export const getAnnotationById = async (
    db: LibSQLDatabase,
    userId: number,
    id: number
) => {
    try {
        const result = await db
            .select()
            .from(annotations)
            .where(and(eq(annotations.userId, userId), eq(annotations.id, id)))
            .get();
        return { data: result, success: true };
    } catch (error) {
        console.error('Error getting annotation by id:', error);
        return { error: 'Failed to retrieve annotation', success: false };
    }
}

//Create annotation
export const createAnnotation = async (
    db: LibSQLDatabase,
    body: typeof annotations.$inferInsert
) => {
    try {
        const result = await db
            .insert(annotations)
            .values({
                taskId: body.taskId,
                userId: body.userId,
                projectId: body.projectId,
                annotationData: body.annotationData,
                isGroundTruth: body.isGroundTruth,
                reviewStatus: body.reviewStatus,
                reviewerId: body.reviewerId,  
            })
            .returning()
            .get();
        return { data: result, success: true };
    } catch (error) {
        console.error('Error creating annotation:', error);
        return { error: 'Failed to create annotation', success: false };
    }
}

//Update annotation

//delete annotation
