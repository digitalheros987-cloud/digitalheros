-- Secure the role column against unauthorized modification

-- Create a function that prevents changing the role column unless the user is an admin
CREATE OR REPLACE FUNCTION check_role_update()
RETURNS TRIGGER AS $$
BEGIN
    -- If the role is being changed
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        -- Allow if the current user is an admin (using the existing is_admin function)
        -- Or if the update is coming from a service role (where auth.uid() is null or bypasses RLS)
        IF NOT is_admin() AND auth.role() = 'authenticated' THEN
            RAISE EXCEPTION 'Unauthorized: Normal users cannot change their role.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_role_security
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION check_role_update();
