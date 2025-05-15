type OrganizationPermissionFlags = {
    editOrganization: boolean;
    deleteOrganization: boolean;
    editMembers: boolean;
    editRoles: boolean;
    editProjects: boolean;
    createProjects: boolean;
    deleteProjects: boolean;
}

type ProjectPermissionFlags = {
    editProject: boolean;
    deleteProject: boolean;
    editMembers: boolean;
    editRoles: boolean;
    uploadFiles: boolean;    
}