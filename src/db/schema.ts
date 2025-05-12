import { sql } from 'drizzle-orm';
import { sqliteTable, text, int } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
    id: int('id').primaryKey({
        autoIncrement: true,
    }),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    isActiveUser: int('is_active_user', { mode: 'boolean' }).notNull().default(true),
    createdAt: int({ mode: 'number' })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: int({ mode: 'number' })
        .notNull()
        .default(sql`(unixepoch())`),
});

export const organizations = sqliteTable('organizations', {
    id: int('id').primaryKey({
        autoIncrement: true,
    }),
    ownerId: int('owner_id')
        .notNull()
        .references(() => users.id),
    name: text('name').notNull(),
    logo: text('logo'),
    description: text('description'),
    isActiveOrg: int('is_active_org', { mode: 'boolean' }).notNull().default(true),
    createdAt: int({ mode: 'number' })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: int({ mode: 'number' })
        .notNull()
        .default(sql`(unixepoch())`),
});

export const roles = sqliteTable('roles', {
    id: int('id').primaryKey({
        autoIncrement: true,
    }),
    name: text('name').notNull(),
    description: text('description'),
    scope: text('scope', ['project', 'organization']).notNull(),
    organizationId: int('organization_id').references(() => organizations.id),
    permissionFlags: text('permission_flags').notNull(), //this will be a json string
    createdAt: int({ mode: 'number' })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: int({ mode: 'number' })
        .notNull()
        .default(sql`(unixepoch())`),
});

export const organization_relations = sqliteTable('organization_relations', {
    id: int('id').primaryKey({
        autoIncrement: true,
    }),
    userId: int('user_id')
        .notNull()
        .references(() => users.id),
    organizationId: int('organization_id')
        .notNull()
        .references(() => organizations.id),
    roleId: int('role_id')
        .notNull()
        .references(() => roles.id),
    createdAt: int({ mode: 'number' })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: int({ mode: 'number' })
        .notNull()
        .default(sql`(unixepoch())`),
});

export const project_type = sqliteTable('project_type', {
    id: int('id').primaryKey({
        autoIncrement: true,
    }),
    name: text('name').notNull(),
    createdAt: int({ mode: 'number' })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: int({ mode: 'number' })
        .notNull()
        .default(sql`(unixepoch())`),
});

export const projects = sqliteTable('projects', {
    id: int('id').primaryKey({
        autoIncrement: true,
    }),
    organizationId: int('organization_id')
        .notNull()
        .references(() => organizations.id),
    name: text('name').notNull(),
    description: text('description'),
    projectType: int('project_type')
        .notNull()
        .references(() => project_type.id), //this will reference a project type table
    labelConfig: text('label_config'), //this will be a json string
    createdAt: int({ mode: 'number' })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: int({ mode: 'number' })
        .notNull()
        .default(sql`(unixepoch())`),
});

export const project_relations = sqliteTable('project_relations', {
    id: int('id').primaryKey({
        autoIncrement: true,
    }),
    userId: int('user_id')
        .notNull()
        .references(() => users.id),
    projectId: int('project_id')
        .notNull()
        .references(() => projects.id),
    roleId: int('role_id')
        .notNull()
        .references(() => roles.id), //scope in the roles table should be project in order to be valid
    createdAt: int({ mode: 'number' })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: int({ mode: 'number' })
        .notNull()
        .default(sql`(unixepoch())`),
});

export const tasks = sqliteTable('tasks', {
    id: int('id').primaryKey({
        autoIncrement: true,
    }),
    projectId: int('project_id')
        .notNull()
        .references(() => projects.id),
    dataUrl: text('data_url').notNull(),
    dataType: text('data_type').notNull(), //this will be a json string
    status: text('status', ['pending', 'assigned', 'completed']).notNull().default('pending'),
    assignedTo: int('assigned_to').references(() => users.id), //NULL if the task is in the pool
    metadata: text('metadata'), //this will be a json string
    priority: int('priority').notNull().default(0),
    createdAt: int({ mode: 'number' })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: int({ mode: 'number' })
        .notNull()
        .default(sql`(unixepoch())`),
});

export const annotations = sqliteTable('annotations', {
    id: int('id').primaryKey({
        autoIncrement: true,
    }),
    taskId: int('task_id')
        .notNull()
        .references(() => tasks.id), //this will reference a task table
    userId: int('user_id')
        .notNull()
        .references(() => users.id),
    projectId: int('project_id')
        .notNull()
        .references(() => projects.id),
    annotationData: text('annotation_data').notNull(), //this will be a json string
    isGroundTruth: int('is_ground_truth', {
        mode: 'boolean',
    })
        .notNull()
        .default(false),
    reviewStatus: text('review_status', ['pending', 'approved', 'rejected']).notNull().default('pending'),
    reviewerId: int('reviewer_id').references(() => users.id),
    createdAt: int({ mode: 'number' })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: int({ mode: 'number' })
        .notNull()
        .default(sql`(unixepoch())`),
});
