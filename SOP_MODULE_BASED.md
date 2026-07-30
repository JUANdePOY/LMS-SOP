CREATE TABLE sop_modules (

    id INT AUTO_INCREMENT PRIMARY KEY,

    sop_id INT NOT NULL,

    title VARCHAR(255) NOT NULL,

    content LONGTEXT,

    sort_order INT DEFAULT 1,

    created_by INT NULL,

    updated_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,


    FOREIGN KEY (sop_id)
        REFERENCES sops(id)
        ON DELETE CASCADE,


    FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE SET NULL,


    FOREIGN KEY (updated_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);


CREATE TABLE sop_module_attachments (

    id INT AUTO_INCREMENT PRIMARY KEY,

    module_id INT NOT NULL,

    file_name VARCHAR(255) NOT NULL,

    mime_type VARCHAR(100),

    file_size BIGINT,

    file_data LONGBLOB,

    uploaded_by INT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,


    FOREIGN KEY(module_id)
        REFERENCES sop_modules(id)
        ON DELETE CASCADE,


    FOREIGN KEY(uploaded_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);




ALTER TABLE sop_modules
ADD COLUMN is_deleted TINYINT(1) DEFAULT 0 AFTER sort_order,
ADD COLUMN deleted_at DATETIME NULL AFTER updated_at;



ALTER TABLE sop_module_attachments
ADD COLUMN file_extension VARCHAR(20)
AFTER mime_type;

ALTER TABLE sop_module_attachments
ADD COLUMN download_count INT DEFAULT 0;






Business
 |
Department
 |
Category
 |
SOP
 |
 |
 +----------------+
 |                |
Modules       Approval
 |
 |
 +----------------+
 |
Attachments

 |
 |
Assignments

 |
 |
Acknowledgements

 |
 |
Audit Logs