import type { LibSQLDatabase } from 'drizzle-orm/libsql/driver-core';
import { eq, and, desc, isNull, gt } from 'drizzle-orm';
import { tasks, projects, annotations } from '../../db/schema';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

// Get all tasks for a project
export const getTasksByProject = async (db: LibSQLDatabase, projectId: number, _userId: number) => {
    try {
        const allTasks = await db
            .select({
                id: tasks.id,
                projectId: tasks.projectId,
                dataUrl: tasks.dataUrl,
                dataType: tasks.dataType,
                status: tasks.status,
                assignedTo: tasks.assignedTo,
                metadata: tasks.metadata,
                priority: tasks.priority,
                createdAt: tasks.createdAt,
                updatedAt: tasks.updatedAt,
            })
            .from(tasks)
            .where(eq(tasks.projectId, projectId))
            .orderBy(desc(tasks.priority), desc(tasks.createdAt));

        // Group tasks by status
        const groupedTasks = {
            unassigned: allTasks.filter(task => task.status === 'unassigned'),
            annotating: allTasks.filter(task => task.status === 'annotating'),
            completed: allTasks.filter(task => task.status === 'completed')
        };
        
        return { data: groupedTasks, success: true };
    } catch (error: any) {
        console.error('Error getting tasks by project:', error);
        return { error: error.message || 'Failed to retrieve tasks', success: false };
    }
};

// Get tasks assigned to a specific user
export const getTasksByUser = async (db: LibSQLDatabase, userId: number, projectId?: number) => {
    try {
        const whereCondition = projectId 
            ? and(eq(tasks.assignedTo, userId), eq(tasks.projectId, projectId))
            : eq(tasks.assignedTo, userId);

        const result = await db
            .select({
                id: tasks.id,
                projectId: tasks.projectId,
                dataUrl: tasks.dataUrl,
                dataType: tasks.dataType,
                status: tasks.status,
                assignedTo: tasks.assignedTo,
                metadata: tasks.metadata,
                priority: tasks.priority,
                createdAt: tasks.createdAt,
                updatedAt: tasks.updatedAt,
            })
            .from(tasks)
            .where(whereCondition)
            .orderBy(desc(tasks.priority), desc(tasks.createdAt));
        
        return { data: result, success: true };
    } catch (error: any) {
        console.error('Error getting tasks by user:', error);
        return { error: error.message || 'Failed to retrieve user tasks', success: false };
    }
};

// Get unassigned tasks (task pool)
export const getUnassignedTasks = async (db: LibSQLDatabase, projectId: number) => {
    try {
        const result = await db
            .select({
                id: tasks.id,
                projectId: tasks.projectId,
                dataUrl: tasks.dataUrl,
                dataType: tasks.dataType,
                status: tasks.status,
                assignedTo: tasks.assignedTo,
                metadata: tasks.metadata,
                priority: tasks.priority,
                createdAt: tasks.createdAt,
                updatedAt: tasks.updatedAt,
            })
            .from(tasks)
            .where(and(eq(tasks.projectId, projectId), isNull(tasks.assignedTo)))
            .orderBy(desc(tasks.priority), desc(tasks.createdAt));
        
        return { data: result, success: true };
    } catch (error: any) {
        console.error('Error getting unassigned tasks:', error);
        return { error: error.message || 'Failed to retrieve unassigned tasks', success: false };
    }
};

// Get task by ID
export const getTaskById = async (db: LibSQLDatabase, taskId: number) => {
    try {
        const task = await db
            .select({
                id: tasks.id,
                projectId: tasks.projectId,
                dataUrl: tasks.dataUrl,
                dataType: tasks.dataType,
                status: tasks.status,
                assignedTo: tasks.assignedTo,
                metadata: tasks.metadata,
                priority: tasks.priority,
                createdAt: tasks.createdAt,
                updatedAt: tasks.updatedAt,
            })
            .from(tasks)
            .where(eq(tasks.id, taskId))
            .get();
    
            if (!task) {
            throw new Error(`Task with ID ${taskId} not found`);
        }
        const nextTask = await db
            .select({
                id: tasks.id
            })
            .from(tasks)
            .where(
                and(
                    eq(tasks.projectId, task.projectId),
                    eq(tasks.status, 'annotating'),
                    gt(tasks.id, taskId)
                )
            )
            .orderBy(desc(tasks.priority), desc(tasks.createdAt))
            .limit(1)
            .get();

        const result = {
            ...task,
            nextTaskId: nextTask ? nextTask.id : null
        }

        return { data: result, success: true };
    } catch (error: any) {
        console.error('Error getting task by ID:', error);
        return { error: error.message || 'Failed to retrieve task', success: false };
    }
};

// Create a new task
export const createTask = async (
    db: LibSQLDatabase,
    projectId: number,
    dataUrl: string,
    dataType: string,
    metadata?: any,
    priority?: number
) => {
    try {
        const result = await db
            .insert(tasks)
            .values({
                projectId,
                dataUrl,
                dataType: JSON.stringify(dataType),
                metadata: metadata ? JSON.stringify(metadata) : null,
                status: 'unassigned',
                priority: priority || 0,
            })
            .returning()
            .get();
        
        return { data: result, success: true };
    } catch (error: any) {
        console.error('Error creating task:', error);
        return { error: error.message || 'Failed to create task', success: false };
    }
};

// Update task
export const updateTask = async (
    db: LibSQLDatabase,
    taskIds: number | number[],
    updates: Partial<{
        status: typeof tasks.$inferSelect['status'];
        assignedTo: number | null;
        metadata: any;
        priority: number;
    }>
) => {
    try {
        const updateData: any = {};
        
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.assignedTo !== undefined) updateData.assignedTo = updates.assignedTo;
        if (updates.metadata !== undefined) updateData.metadata = JSON.stringify(updates.metadata);
        if (updates.priority !== undefined) updateData.priority = updates.priority;
        
        // Handle single taskId
        if (typeof taskIds === 'number') {
            const result = await db
                .update(tasks)
                .set(updateData)
                .where(eq(tasks.id, taskIds))
                .returning()
                .get();
            
            return { data: result, success: true };
        }
        
        // Handle array of taskIds
        const results = [];
        for (const taskId of taskIds) {
            const result = await db
                .update(tasks)
                .set(updateData)
                .where(eq(tasks.id, taskId))
                .returning()
                .get();
            
            if (result) {
                results.push(result);
            }
        }
        
        return { data: results, success: true };
    } catch (error: any) {
        console.error('Error updating task(s):', error);
        return { error: error.message || 'Failed to update task(s)', success: false };
    }
};

// Assign task to user
export const assignTask = async (db: LibSQLDatabase, taskId: number, userId: number) => {
    try {
        const result = await db
            .update(tasks)
            .set({ 
                assignedTo: userId, 
                status: 'annotating'
            })
            .where(eq(tasks.id, taskId))
            .returning()
            .get();
        
        return { data: result, success: true };
    } catch (error: any) {
        console.error('Error assigning task:', error);
        return { error: error.message || 'Failed to assign task', success: false };
    }
};

// Unassign task (return to pool)
export const unassignTask = async (db: LibSQLDatabase, taskId: number) => {
    try {
        const result = await db
            .update(tasks)
            .set({ 
                assignedTo: null, 
                status: 'unassigned'
            })
            .where(eq(tasks.id, taskId))
            .returning()
            .get();
        
        return { data: result, success: true };
    } catch (error: any) {
        console.error('Error unassigning task:', error);
        return { error: error.message || 'Failed to unassign task', success: false };
    }
};

// Complete task
export const completeTask = async (db: LibSQLDatabase, taskId: number) => {
    try {
        const result = await db
            .update(tasks)
            .set({ status: 'completed' })
            .where(eq(tasks.id, taskId))
            .returning()
            .get();
        
        return { data: result, success: true };
    } catch (error: any) {
        console.error('Error completing task:', error);
        return { error: error.message || 'Failed to complete task', success: false };
    }
};

// Delete task
export const deleteTask = async (db: LibSQLDatabase, taskId: number) => {
    try {
        const result = await db
            .delete(tasks)
            .where(eq(tasks.id, taskId))
            .returning()
            .get();
        
        return { data: result, success: true };
    } catch (error: any) {
        console.error('Error deleting task:', error);
        return { error: error.message || 'Failed to delete task', success: false };
    }
};

// Get task statistics for a project
export const getTaskStats = async (db: LibSQLDatabase, projectId: number) => {
    try {
        const allTasks = await db
            .select({ status: tasks.status })
            .from(tasks)
            .where(eq(tasks.projectId, projectId));
        
        const stats = {
            total: allTasks.length,
            unassigned: allTasks.filter(t => t.status === 'unassigned').length,
            annotating: allTasks.filter(t => t.status === 'annotating').length,
            completed: allTasks.filter(t => t.status === 'completed').length,
        };
        
        return { data: stats, success: true };
    } catch (error: any) {
        console.error('Error getting task stats:', error);
        return { error: error.message || 'Failed to get task statistics', success: false };
    }
};

// Export dataset as ZIP file
export const exportDataset = async (
    db: LibSQLDatabase, 
    projectId: number, 
    format: string = 'yolo',
    splitConfig?: { train: number; test: number; validation: number }
) => {
    try {
        // Get project info
        const project = await db
            .select({
                id: projects.id,
                name: projects.name,
                description: projects.description,
            })
            .from(projects)
            .where(eq(projects.id, projectId))
            .get();

        if (!project) {
            return { error: 'Project not found', success: false };
        }

        // Get all completed tasks for the project
        const completedTasks = await db
            .select({
                id: tasks.id,
                projectId: tasks.projectId,
                dataUrl: tasks.dataUrl,
                dataType: tasks.dataType,
                metadata: tasks.metadata,
                createdAt: tasks.createdAt,
            })
            .from(tasks)
            .where(and(eq(tasks.projectId, projectId), eq(tasks.status, 'completed')));

        if (completedTasks.length === 0) {
            return { error: 'No completed tasks found for export', success: false };
        }

        console.log(`Found ${completedTasks.length} completed tasks for export`);

        // Create temporary directory for the dataset
        const tempDir = path.join(process.cwd(), 'temp', `dataset_${projectId}_${Date.now()}`);
        const imagesDir = path.join(tempDir, 'images');
        const labelsDir = path.join(tempDir, 'labels');

        // Create directories
        await fs.promises.mkdir(tempDir, { recursive: true });
        await fs.promises.mkdir(imagesDir, { recursive: true });
        await fs.promises.mkdir(labelsDir, { recursive: true });

        const exportData = [];
        
        for (const task of completedTasks) {
            console.log(`Processing task ${task.id} with dataUrl: ${task.dataUrl}`);
            
            // Get the first annotation for this task
            const annotation = await db
                .select({
                    id: annotations.id,
                    taskId: annotations.taskId,
                    annotationData: annotations.annotationData,
                    isGroundTruth: annotations.isGroundTruth,
                    createdAt: annotations.createdAt,
                })
                .from(annotations)
                .where(eq(annotations.taskId, task.id))
                .limit(1)
                .get();

            console.log(`Task ${task.id} annotation:`, annotation ? 'Found' : 'Not found');

            if (annotation) {
                try {
                    // Get local image path from dataUrl
                    const localImagePath = getLocalImagePath(task.dataUrl);
                    console.log(`Task ${task.id} local image path: ${localImagePath}`);
                    
                    // Check if local image file exists
                    if (!fs.existsSync(localImagePath)) {
                        console.error(`Image file not found: ${localImagePath}`);
                        continue;
                    }

                    console.log(`Task ${task.id} image file exists, copying...`);

                    // Copy image to export directory
                    const exportImagePath = path.join(imagesDir, `${task.id}.png`);
                    await fs.promises.copyFile(localImagePath, exportImagePath);

                    // Get image dimensions for YOLO normalization
                    const imageDimensions = await getImageDimensions(exportImagePath);
                    console.log(`Task ${task.id} image dimensions:`, imageDimensions);

                    // Convert annotation to specified format
                    let annotationContent = '';
                    if (format === 'yolo') {
                        annotationContent = convertToYoloFormat(annotation.annotationData, imageDimensions);
                    } else {
                        // For JSON format or others
                        annotationContent = JSON.stringify(annotation.annotationData, null, 2);
                    }

                    console.log(`Task ${task.id} annotation content:`, annotationContent.substring(0, 100));

                    // Save annotation file
                    const annotationPath = path.join(labelsDir, `${task.id}.${format === 'yolo' ? 'txt' : 'json'}`);
                    await fs.promises.writeFile(annotationPath, annotationContent);

                    exportData.push({
                        taskId: task.id,
                        imageUrl: task.dataUrl,
                        imagePath: exportImagePath,
                        annotationPath: annotationPath,
                        metadata: task.metadata ? JSON.parse(task.metadata) : null,
                        annotationId: annotation.id,
                        isGroundTruth: annotation.isGroundTruth,
                    });

                    console.log(`Successfully processed task ${task.id}`);
                } catch (copyError) {
                    console.error(`Failed to process task ${task.id}:`, copyError);
                    // Continue with other tasks
                }
            } else {
                console.log(`No annotation found for task ${task.id}, skipping...`);
            }
        }

        if (exportData.length === 0) {
            // Clean up temp directory
            await fs.promises.rm(tempDir, { recursive: true, force: true });
            return { error: 'No valid data could be exported', success: false };
        }

        // Create data.yaml file for YOLO format
        if (format === 'yolo') {
            const yamlContent = createYamlContent(project, exportData, splitConfig);
            await fs.promises.writeFile(path.join(tempDir, 'data.yaml'), yamlContent);
        }

        // Create ZIP file
        const zipPath = path.join(process.cwd(), 'temp', `dataset_${projectId}_${Date.now()}.zip`);
        await createZipFile(tempDir, zipPath);

        // Clean up temp directory
        await fs.promises.rm(tempDir, { recursive: true, force: true });

        return { 
            data: {
                format: format,
                projectId: projectId,
                projectName: project.name,
                totalTasks: completedTasks.length,
                exportedTasks: exportData.length,
                zipPath: zipPath,
                exportedAt: Date.now(),
                splitConfig: splitConfig
            }, 
            success: true 
        };
    } catch (error: any) {
        console.error('Error exporting dataset:', error);
        return { error: error.message || 'Failed to export dataset', success: false };
    }
};

// Helper function to convert annotation data to YOLO format with proper normalization
const convertToYoloFormat = (annotationData: any, imageDimensions: { width: number; height: number }) => {
    try {
        let annotations = [];
        
        // Handle different annotation data formats
        if (annotationData.annotations && Array.isArray(annotationData.annotations)) {
            annotations = annotationData.annotations;
        } else if (Array.isArray(annotationData)) {
            annotations = annotationData;
        } else if (annotationData.type) {
            annotations = [annotationData];
        }

        const yoloLines = [];
        
        for (const ann of annotations) {
            if (ann.type === 'rectangle' && ann.startPoint && ann.width && ann.height) {
                // Convert rectangle to YOLO format with normalization
                const x_center = (ann.startPoint.x + ann.width / 2) / imageDimensions.width;
                const y_center = (ann.startPoint.y + ann.height / 2) / imageDimensions.height;
                const width = Math.abs(ann.width) / imageDimensions.width;
                const height = Math.abs(ann.height) / imageDimensions.height;
                
                // Class ID (default to 0 if no class specified)
                const classId = ann.classId || 0;
                
                // YOLO format: class_id x_center y_center width height (normalized between 0-1)
                yoloLines.push(`${classId} ${x_center.toFixed(6)} ${y_center.toFixed(6)} ${width.toFixed(6)} ${height.toFixed(6)}`);
                
            } else if (ann.type === 'rectangle' && ann.bbox && Array.isArray(ann.bbox)) {
                // Handle COCO bbox format [x, y, width, height]
                const [x, y, width, height] = ann.bbox;
                const x_center = (x + width / 2) / imageDimensions.width;
                const y_center = (y + height / 2) / imageDimensions.height;
                const norm_width = width / imageDimensions.width;
                const norm_height = height / imageDimensions.height;
                const classId = ann.classId || 0;
                
                yoloLines.push(`${classId} ${x_center.toFixed(6)} ${y_center.toFixed(6)} ${norm_width.toFixed(6)} ${norm_height.toFixed(6)}`);
            }
            // Note: YOLO format typically supports only bounding boxes
            // Polygons and other shapes would need different handling or conversion to bounding boxes
        }
        
        return yoloLines.join('\n');
    } catch (error) {
        console.error('Error converting to YOLO format:', error);
        return '';
    }
};

// Helper function to get local image path from URL
const getLocalImagePath = (dataUrl: string): string => {
    // Extract filename from URL (assuming URLs like http://localhost:8787/api/bucket/taskData/27/filename.png)
    console.log('Processing dataUrl:', dataUrl);
    
    if (dataUrl.includes('/bucket/taskData/')) {
        // Handle task-specific images - but they're actually stored in projects folder
        const pathParts = dataUrl.split('/bucket/taskData/').pop();
        const result = path.join(process.cwd(), 'bucket', 'projects', pathParts || '');
        console.log('TaskData->Projects path result:', result);
        return result;
    } else if (dataUrl.includes('/bucket/projects/')) {
        // Handle project-specific images
        const pathParts = dataUrl.split('/bucket/projects/').pop();
        const result = path.join(process.cwd(), 'bucket', 'projects', pathParts || '');
        console.log('Projects path result:', result);
        return result;
    } else if (dataUrl.includes('/bucket/public/')) {
        const filename = dataUrl.split('/bucket/public/').pop();
        return path.join(process.cwd(), 'bucket', 'public', filename || '');
    } else {
        // Handle other cases - try to extract the path after /bucket/
        const bucketIndex = dataUrl.indexOf('/bucket/');
        if (bucketIndex !== -1) {
            const relativePath = dataUrl.substring(bucketIndex + 8); // Remove '/bucket/'
            return path.join(process.cwd(), 'bucket', relativePath);
        }
        
        // Fallback: assume it's a direct filename in public folder
        const filename = dataUrl.split('/').pop() || dataUrl;
        return path.join(process.cwd(), 'bucket', 'public', filename);
    }
};

// Helper function to get image dimensions from PNG file
const getImageDimensions = async (imagePath: string): Promise<{ width: number; height: number }> => {
    try {
        // Read the first 24 bytes of the PNG file to get dimensions
        const buffer = await fs.promises.readFile(imagePath);
        
        // Check if it's a PNG file (starts with PNG signature)
        if (buffer.length >= 24 && 
            buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
            
            // PNG dimensions are stored at bytes 16-23 (big-endian)
            const width = buffer.readUInt32BE(16);
            const height = buffer.readUInt32BE(20);
            
            return { width, height };
        } else {
            // For non-PNG files or if reading fails, use default dimensions
            console.warn(`Image is not PNG format or header couldn't be read: ${imagePath}. Using default 640x480.`);
            return { width: 640, height: 480 };
        }
    } catch (error) {
        console.error('Error getting image dimensions:', error);
        return { width: 640, height: 480 };
    }
};

// Helper function to create YAML content for YOLO dataset
const createYamlContent = (
    project: any, 
    exportData: any[], 
    splitConfig?: { train: number; test: number; validation: number }
): string => {
    const totalImages = exportData.length;
    const trainCount = splitConfig ? Math.floor(totalImages * splitConfig.train / 100) : Math.floor(totalImages * 0.8);
    const testCount = splitConfig ? Math.floor(totalImages * splitConfig.test / 100) : Math.floor(totalImages * 0.1);
    const valCount = totalImages - trainCount - testCount;
    
    // Get unique class IDs from annotations
    const classIds = new Set<number>();
    exportData.forEach(_item => {
        // Parse annotation files to extract class IDs (simplified)
        classIds.add(0); // Default class
    });
    
    const yamlContent = `# YOLO Dataset Configuration
# Generated by Labeloo - Advanced Annotation Platform
# Project: ${project.name}
# Generated on: ${new Date().toISOString()}

# Dataset paths (relative to this file)
path: .
train: images  # Training images directory
val: images    # Validation images directory  
test: images   # Test images directory

# Note: For this export, all images are in the 'images' folder
# and all labels are in the 'labels' folder
# You can manually split them into train/val/test folders if needed

# Dataset statistics
total_images: ${totalImages}
train_images: ${trainCount}
val_images: ${valCount}
test_images: ${testCount}

# Split configuration used for statistics
split_config:
  train: ${splitConfig?.train || 80}%
  validation: ${splitConfig?.validation || 10}%
  test: ${splitConfig?.test || 10}%

# Class definitions
nc: ${classIds.size}  # Number of classes
names:
  0: 'object'  # Default class name
  # Add more class names as needed

# Dataset information
dataset_info:
  name: "${project.name}"
  description: "${project.description || 'Dataset exported from Labeloo'}"
  format: "YOLO"
  annotation_tool: "Labeloo"
  export_date: "${new Date().toISOString()}"
  images_folder: "images"
  labels_folder: "labels"
  
# Instructions for use:
# 1. All images are in the 'images' folder
# 2. All corresponding labels are in the 'labels' folder  
# 3. Each image has a corresponding .txt file with the same name
# 4. You can split this dataset manually based on the split_config above
  
# Labeloo metadata
labeloo:
  version: "1.0"
  project_id: ${project.id}
  export_format: "yolo"
  website: "https://labeloo.app"
`;
    
    return yamlContent;
};

// Helper function to create ZIP file
const createZipFile = async (sourceDir: string, outputPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Compression level
        });

        output.on('close', () => {
            console.log(`ZIP file created: ${archive.pointer()} total bytes`);
            resolve();
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.pipe(output);
        
        // Add all files from source directory
        archive.directory(sourceDir, false);
        
        archive.finalize();
    });
};
