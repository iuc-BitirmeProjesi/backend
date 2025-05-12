import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import {desc, sql} from 'drizzle-orm';
import { int } from 'drizzle-orm/mysql-core';

export const users = sqliteTable("users",{
    userId: integer('user_id').primaryKey({autoIncrement: true}),
    email : text('email').notNull().unique(),
    password: text('password').notNull(),
    isActiveUser: integer('is_active_user',{mode:'boolean'}).notNull().default(true),
    createdAt: integer('created_at').notNull().default(sql`strftime('%s','now')`),
    updatedAt: integer('updated_at').notNull().default(sql`strftime('%s','now')`),
});

export const organizations = sqliteTable("organizations",{
    organizationId: integer('organization_id').primaryKey({autoIncrement: true}),
    ownerId: integer('owner_id').notNull().references(() => users.userId),
    name: text('name').notNull(),
    logo: text('logo'),
    description: text('description'),
    isActiveOrg: integer('is_active_org',{mode:'boolean'}).notNull().default(true)
});


export const roles = sqliteTable("roles",{
    roleId : integer('role_id').primaryKey({autoIncrement: true}),
    name: text('name').notNull(),
    description: text('description'),
    scope:text('scope', ['project', 'organization']).notNull(),
    organizationId:integer('organization_id').references(() => organizations.organizationId),
    permissionFlags: text('permission_flags').notNull(), //this will be a json string
});

export const organization_relations = sqliteTable("organization_relations",{
    orgRelationId: integer('org_relation_id').primaryKey({autoIncrement: true}),
    userId: integer('user_id').notNull().references(() => users.userId),
    organizationId: integer('organization_id').notNull().references(() => organizations.organizationId),
    roleId: integer('role_id').notNull().references(()=>roles.roleId),
});



export const projects = sqliteTable("projects",{
    projectId: integer('project_id').primaryKey({autoIncrement: true}),
    organizationId: integer('organization_id').notNull().references(() => organizations.organizationId),
    name: text('name').notNull(),
    description: text('description'),
    projectType: integer('project_type').notNull().references(()=>project_type.typeId), //this will reference a project type table
    labelConfig: text('label_config'), //this will be a json string
});

export const project_type = sqliteTable("project_type",{
    typeId: integer('type_id').primaryKey({autoIncrement: true}),
    name: text('name').notNull(),
});

export const project_relations = sqliteTable("project_relations",{
    projRelationId: integer('proj_relation_id').primaryKey({autoIncrement: true}),
    userId: integer('user_id').notNull().references(() => users.userId),
    projectId: integer('project_id').notNull().references(() => projects.projectId),
    roleId: integer('role_id').notNull().references(()=>roles.roleId), //scope in the roles table should be project in order to be valid
})

export const annotations = sqliteTable("annotations",{
    annotationId: integer('annotation_id').primaryKey({autoIncrement: true}),
    taskId : integer('task_id').notNull().references(()=>tasks.taskId), //this will reference a task table
    userId: integer('user_id').notNull().references(() => users.userId),
    projectId: integer('project_id').notNull().references(() => projects.projectId),
    annotationData: text('annotation_data').notNull(), //this will be a json string
    isGroundTruth: integer('is_ground_truth',{mode:'boolean'}).notNull().default(false),
    reviewStatus: text('review_status', ['pending', 'approved', 'rejected']).notNull().default('pending'),
    reviewerId: integer('reviewer_id').references(() => users.userId),
    createdAt: integer('created_at').notNull().default(sql`strftime('%s','now')`),
    updatedAt: integer('updated_at').notNull().default(sql`strftime('%s','now')`),
})

export const tasks = sqliteTable("tasks",{
    taskId: integer('task_id').primaryKey({autoIncrement: true}),
    projectId: integer('project_id').notNull().references(() => projects.projectId),
    dataUrl: text('data_url').notNull(),
    dataType: text('data_type').notNull(), //this will be a json string
    status: text('status', ['pending', 'assigned', 'completed']).notNull().default('pending'),
    assignedTo: integer('assigned_to').references(() => users.userId),//NULL if the task is in the pool
    metadata: text('metadata'), //this will be a json string
    createdAt: integer('created_at').notNull().default(sql`strftime('%s','now')`),
    updatedAt: integer('updated_at').notNull().default(sql`strftime('%s','now')`),
    priority: integer('priority').notNull().default(0),
})