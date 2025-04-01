-- INSERT INTO users (username, password, high_score) 
-- VALUES 
-- ('hhawksley0', '$2y$10$nQOphhKDGRfCz5R095pWZev8ElyjDPUKPtM5eCieP/JM22HcMAU06', 500),-- password unencrypted: Stu123456!
-- ('username', '$2y$10$PHwrEy/TBm3HRqnTrPqlveYE5Ytjyjekq65Rn.r89CYUS6uuMCNjm', 100); -- password unencrypted: password

-- Insert a new group (hardcoded for initial setup)
INSERT INTO groups (group_name, group_code) 
VALUES ('Roomie Squad', '123456')
ON CONFLICT (group_code) DO NOTHING;

-- Ensure we get the correct group ID
INSERT INTO users (username, password, high_score, group_id) 
VALUES 
    ('alice', '$2a$10$7Fn1RQidHVlJzg68Xt4lb.rnL4WBqltbDRCwDtmBlTioVDMXhsZ.u', 100, (SELECT id FROM groups WHERE group_code = '123456')),
    ('bob', '$2y$10$nQOphhKDGRfCz5R095pWZev8ElyjDPUKPtM5eCieP/JM22HcMAU06', 500, (SELECT id FROM groups WHERE group_code = '123456')), -- password unencrypted: Stu123456!
    ('charlie', '$2y$10$PHwrEy/TBm3HRqnTrPqlveYE5Ytjyjekq65Rn.r89CYUS6uuMCNjm', 200, (SELECT id FROM groups WHERE group_code = '123456')) -- password unencrypted: password
ON CONFLICT (username) DO NOTHING;

-- Insert tasks using a direct subquery for group_id
INSERT INTO tasks (group_id, task_name, assigned_user, completed, frequency)
VALUES 
    ((SELECT id FROM groups WHERE group_code = '123456'), 'Take out the trash', 'alice', FALSE, 'daily'),
    ((SELECT id FROM groups WHERE group_code = '123456'), 'Clean the kitchen', 'bob', FALSE, 'weekly'),
    ((SELECT id FROM groups WHERE group_code = '123456'), 'Vacuum the living room', NULL, FALSE, 'monthly'), -- Unassigned task
    ((SELECT id FROM groups WHERE group_code = '123456'), 'Pay rent', 'charlie', TRUE, 'monthly') -- Completed task
ON CONFLICT DO NOTHING;
