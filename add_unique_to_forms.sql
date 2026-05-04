-- Add unique constraint to file_id to prevent duplicates in forms_library
ALTER TABLE forms_library ADD CONSTRAINT unique_file_id UNIQUE (file_id);
