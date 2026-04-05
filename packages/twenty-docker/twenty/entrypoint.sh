#!/bin/sh
set -e

# Save original APP_VERSION for the running application
ORIGINAL_APP_VERSION="${APP_VERSION:-}"

setup_and_migrate_db() {
    if [ "${DISABLE_DB_MIGRATIONS}" = "true" ]; then
        echo "Database setup and migrations are disabled, skipping..."
        return
    fi

    echo "Running database setup and migrations..."

    # Run setup and migration scripts
    has_schema=$(psql -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'core')" ${PG_DATABASE_URL})
    if [ "$has_schema" = "f" ]; then
        echo "Database appears to be empty, running migrations."
        yarn database:init:prod
    fi

    yarn command:prod cache:flush

    # The upgrade runner only processes ONE version step per invocation.
    # Step through each supported version sequentially.
    # Workspaces already at or above a version are automatically skipped.
    for step_version in 1.20.0 1.21.0; do
        echo ""
        echo "======================================================"
        echo "  Upgrade step: APP_VERSION=${step_version}"
        echo "======================================================"
        export APP_VERSION="${step_version}"
        yarn command:prod upgrade
        echo "  Upgrade step ${step_version} completed."
    done

    yarn command:prod cache:flush

    # Restore original APP_VERSION for the running application
    if [ -n "${ORIGINAL_APP_VERSION}" ]; then
        export APP_VERSION="${ORIGINAL_APP_VERSION}"
    fi

    # Sync standard objects for new objects added since last upgrade (e.g. phoneCall)
    if yarn command:prod workspace:sync-standard-objects; then
        echo "Successfully synced standard objects!"
    else
        echo "Warning: Standard object sync failed or no changes needed, continuing..."
    fi

    echo "Successfully migrated DB!"
}

register_background_jobs() {
    if [ "${DISABLE_CRON_JOBS_REGISTRATION}" = "true" ]; then
        echo "Cron job registration is disabled, skipping..."
        return
    fi

    echo "Registering background sync jobs..."
    if yarn command:prod cron:register:all; then
        echo "Successfully registered all background sync jobs!"
    else
        echo "Warning: Failed to register background jobs, but continuing startup..."
    fi
}

setup_and_migrate_db
register_background_jobs

# Continue with the original Docker command
exec "$@"
