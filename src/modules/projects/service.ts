import type { LibSQLDatabase } from 'drizzle-orm/libsql/driver-core';
import { projects, project_relations, roles } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export type Project = {
    id?: number;
    organizationId: number;
    name: string;
    projectType: number;
    description?: string;
    // labelConfig?: string; this doesn't have a value right now.
}

//get all projects with userId
export const getProjects = async (
    db: LibSQLDatabase,
    userId: number
) => {
    try {
        const result = await db
            .select()
            .from(projects)
            .innerJoin(
                project_relations,
                eq(projects.id, project_relations.projectId)
            )
            .where(eq(project_relations.userId,userId))
            .orderBy(desc(projects.createdAt))
            .all();

        return { data: result, success: true };
    } catch (error) {
        console.error('Error getting projects:', error);
        return { error: 'Failed to retrieve projects', success: false };
    }
}

//get project by id
export const getProjectById = async (
    db: LibSQLDatabase,
    userId: number,
    id: number
) => {
    try {
        const result = await db
            .select()
            .from(projects)
            .where(
                and(
                    eq(projects.id, id),
                    eq(project_relations.userId, userId)
                )
            )
            .innerJoin(
                project_relations,
                eq(projects.id, project_relations.projectId)
            )
            .get();
        return { data: result, success: true };
    } catch (error) {
        console.error('Error getting project by id:', error);
        return { error: 'Failed to retrieve project', success: false };
    }
}

//create project (also insert into project relations with transaction when inserting into projects)
export const createProject = async (
    db: LibSQLDatabase,
    projectData: Project,
    userId: number
) => {
    try {
        // Start a transaction
        await db.transaction(async (tx) => {
            // Insert into projects table
            const result = await tx
                .insert(projects)
                .values({
                    organizationId: projectData.organizationId,
                    name: projectData.name,
                    description: projectData.description,
                    projectType: projectData.projectType,
                })
                .returning()
                .all();

            // Insert into project_relations table
            const createdProject = result[0]; //make sure there is an id to apply into relations

            await tx.insert(project_relations)
            .values({
                userId: userId,
                projectId:createdProject.id,
                roleId: 1, // Assuming 1 is the admin role ID
            });
        });

        return { data: projectData, success: true };
    } catch (error) {
        console.error('Error creating project:', error);
        return { error: 'Failed to create project', success: false };
    }
}

//update project
export const updateProject = async (
    db: LibSQLDatabase,
    projectData: Project,
    id: number,
    userId: number
) => {
    try {

         // auth control
        const authorized = await db
            .select()
            .from(projects)
            .innerJoin(project_relations, eq(projects.id, project_relations.projectId))
            .where(
                and(
                    eq(projects.id, id),
                    eq(project_relations.userId, userId)
                )
            )
            .get();

        if (!authorized) {
            return { error: 'Unauthorized', success: false };
        }

        const result = await db
            .update(projects)
            .set({
                organizationId: projectData.organizationId,
                name: projectData.name,
                description: projectData.description,
                projectType: projectData.projectType,
            })
            .where(eq(projects.id, id))
            .returning()
            .get();

        return { data: result, success: true };
    } catch (error) {
        console.error('Error updating project:', error);
        return { error: 'Failed to update project', success: false };
    }
}

//delete project (also delete from project relations with transaction when deleting from projects with auth control and check if project exists)
export const deleteProject = async (
    db: LibSQLDatabase,
    id: number,
    userId: number
) => {
    try {
        // Check if project exists
        const project = await db
            .select()
            .from(projects)
            .where(eq(projects.id, id))
            .get();

        if (!project) {
            return { error: 'Project not found', success: false };
        }
        // auth control
        const authorized = await db
            .select()
            .from(projects)
            .innerJoin(project_relations, eq(projects.id, project_relations.projectId))
            .where(
                and(
                    eq(projects.id, id),
                    eq(project_relations.userId, userId)
                )
            )
            .get();

        if (!authorized) {
            return { error: 'Unauthorized', success: false };
        }

        // Start a transaction
        const result = await db.transaction(async (tx) => {
            // Delete from project_relations table
            await tx.delete(project_relations).where(eq(project_relations.projectId, id));

            // Delete from projects table
            const result = await tx.delete(projects).where(eq(projects.id, id)).returning().get();
            return { data: result, success: true };
        });

       if (!result.success) throw new Error('Failed to delete organization');
       return { data: result.data, success: true };
       
    } catch (error) {
        console.error('Error deleting project:', error);
        return { error: 'Failed to delete project', success: false };
    }
}


