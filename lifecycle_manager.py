#!/usr/bin/env python3
"""
BrainDriveOpenAISettings Plugin Lifecycle Manager (New Architecture)

This script handles install/update/delete operations for the BrainDriveOpenAISettings plugin
using the new multi-user plugin lifecycle management architecture.
"""

import json
import logging
import datetime
import os
import shutil
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import structlog

logger = structlog.get_logger()

# Import the new base lifecycle manager
try:
    # Try to import from the BrainDrive system first (when running in production)
    from app.plugins.base_lifecycle_manager import BaseLifecycleManager
    logger.info("Using new architecture: BaseLifecycleManager imported from app.plugins")
except ImportError:
    try:
        # Try local import for development
        import sys
        current_dir = os.path.dirname(os.path.abspath(__file__))
        backend_path = os.path.join(current_dir, "..", "..", "backend", "app", "plugins")
        backend_path = os.path.abspath(backend_path)
        
        if os.path.exists(backend_path):
            if backend_path not in sys.path:
                sys.path.insert(0, backend_path)
            from base_lifecycle_manager import BaseLifecycleManager
            logger.info(f"Using new architecture: BaseLifecycleManager imported from local backend: {backend_path}")
        else:
            # For remote installation, the base class might not be available
            # In this case, we'll create a minimal implementation
            logger.warning(f"BaseLifecycleManager not found at {backend_path}, using minimal implementation")
            from abc import ABC, abstractmethod
            from datetime import datetime
            from pathlib import Path
            from typing import Set
            
            class BaseLifecycleManager(ABC):
                """Minimal base class for remote installations"""
                def __init__(self, plugin_slug: str, version: str, shared_storage_path: Path):
                    self.plugin_slug = plugin_slug
                    self.version = version
                    self.shared_path = shared_storage_path
                    self.active_users: Set[str] = set()
                    self.instance_id = f"{plugin_slug}_{version}"
                    self.created_at = datetime.now()
                    self.last_used = datetime.now()
                
                async def install_for_user(self, user_id: str, db, shared_plugin_path: Path):
                    if user_id in self.active_users:
                        return {'success': False, 'error': 'Plugin already installed for user'}
                    result = await self._perform_user_installation(user_id, db, shared_plugin_path)
                    if result['success']:
                        self.active_users.add(user_id)
                        self.last_used = datetime.now()
                    return result
                
                async def uninstall_for_user(self, user_id: str, db):
                    if user_id not in self.active_users:
                        return {'success': False, 'error': 'Plugin not installed for user'}
                    result = await self._perform_user_uninstallation(user_id, db)
                    if result['success']:
                        self.active_users.discard(user_id)
                        self.last_used = datetime.now()
                    return result
                
                @abstractmethod
                async def get_plugin_metadata(self): pass
                @abstractmethod
                async def get_module_metadata(self): pass
                @abstractmethod
                async def _perform_user_installation(self, user_id, db, shared_plugin_path): pass
                @abstractmethod
                async def _perform_user_uninstallation(self, user_id, db): pass
            
            logger.info("Using minimal BaseLifecycleManager implementation for remote installation")
            
    except ImportError as e:
        logger.error(f"Failed to import BaseLifecycleManager: {e}")
        raise ImportError("BrainDriveOpenAISettings plugin requires the new architecture BaseLifecycleManager")


class BrainDriveOpenAISettingsLifecycleManager(BaseLifecycleManager):
    """Lifecycle manager for BrainDriveOpenAISettings plugin using new architecture"""
    
    def __init__(self, plugins_base_dir: str = None):
        """Initialize the lifecycle manager"""
        # Define plugin-specific data
        self.plugin_data = {
            "name": "BrainDriveOpenAISettings",
            "description": "OpenAI Settings Plugin for BrainDrive - Manage OpenAI API configuration",
            "version": "1.0.0",
            "type": "frontend",
            "icon": "Settings",
            "category": "settings",
            "official": True,
            "author": "BrainDrive",
            "compatibility": "1.0.0",
            "scope": "BrainDriveOpenAISettings",
            "bundle_method": "webpack",
            "bundle_location": "dist/remoteEntry.js",
            "is_local": False,
            "long_description": "A comprehensive OpenAI settings management plugin that allows users to configure their OpenAI API credentials, select models, and test API connectivity. Features secure API key management, organization ID support, and advanced configuration options.",
            "plugin_slug": "BrainDriveOpenAISettings",
            # Update tracking fields (matching plugin model)
            "source_type": "github",
            "source_url": "https://github.com/your-org/BrainDriveOpenAISettings.git",
            "update_check_url": "https://api.github.com/repos/your-org/BrainDriveOpenAISettings/releases/latest",
            "last_update_check": None,
            "update_available": False,
            "latest_version": None,
            "installation_type": "remote",
            "permissions": ["storage.read", "storage.write", "api.access", "network.external", "settings.read", "settings.write"]
        }
        
        self.module_data = [
            {
                "name": "BrainDriveOpenAISettings",
                "display_name": "OpenAI Settings",
                "description": "Configure and manage OpenAI API credentials and model preferences",
                "icon": "Settings",
                "category": "settings",
                "priority": 1,
                "props": {
                    "apiKey": "",
                    "organizationId": "",
                    "model": "gpt-4o",
                    "maxTokens": 4096,
                    "temperature": 0.7
                },
                "config_fields": {
                    "api_key": {
                        "type": "password",
                        "description": "Your OpenAI API key",
                        "required": True,
                        "placeholder": "sk-..."
                    },
                    "organization_id": {
                        "type": "text",
                        "description": "Your OpenAI organization ID (optional)",
                        "required": False,
                        "placeholder": "org-..."
                    },
                    "model": {
                        "type": "select",
                        "description": "Default OpenAI model to use",
                        "required": True,
                        "default": "gpt-4o",
                        "options": [
                            {"value": "gpt-4o", "label": "GPT-4o (Latest)"},
                            {"value": "gpt-4", "label": "GPT-4"},
                            {"value": "gpt-4-turbo", "label": "GPT-4 Turbo"},
                            {"value": "gpt-3.5-turbo", "label": "GPT-3.5 Turbo"},
                            {"value": "gpt-4o-mini", "label": "GPT-4o Mini"}
                        ]
                    },
                    "max_tokens": {
                        "type": "number",
                        "description": "Maximum tokens for responses",
                        "default": 4096,
                        "min": 1,
                        "max": 8192
                    },
                    "temperature": {
                        "type": "number",
                        "description": "Response creativity (0-2)",
                        "default": 0.7,
                        "min": 0,
                        "max": 2,
                        "step": 0.1
                    },
                    "enable_connection_testing": {
                        "type": "boolean",
                        "description": "Enable API connection testing",
                        "default": True
                    },
                    "auto_save": {
                        "type": "boolean",
                        "description": "Automatically save settings on change",
                        "default": False
                    }
                },
                "messages": {
                    "connection_success": "OpenAI API connection successful",
                    "connection_failed": "OpenAI API connection failed",
                    "settings_saved": "Settings saved successfully",
                    "settings_load_failed": "Failed to load settings",
                    "validation_error": "Please fix validation errors"
                },
                "required_services": {
                    "api": {"methods": ["get", "post", "put", "delete"], "version": "1.0.0"},
                    "event": {"methods": ["sendMessage", "subscribeToMessages", "unsubscribeFromMessages"], "version": "1.0.0"},
                    "theme": {"methods": ["getCurrentTheme", "addThemeChangeListener", "removeThemeChangeListener"], "version": "1.0.0"},
                    "settings": {"methods": ["getSetting", "setSetting", "getSettingDefinitions"], "version": "1.0.0"}
                },
                "dependencies": [],
                "layout": {
                    "minWidth": 6,
                    "minHeight": 8,
                    "defaultWidth": 8,
                    "defaultHeight": 10
                },
                "tags": ["openai", "settings", "api", "configuration", "ai", "gpt", "credentials"]
            }
        ]
        
        # Initialize base class with required parameters
        logger.info(f"BrainDriveOpenAISettings: plugins_base_dir - {plugins_base_dir}")
        if plugins_base_dir:
            # When instantiated by the remote installer, plugins_base_dir points to the plugins directory
            # Shared plugins are stored under plugins_base_dir/shared/plugin_slug/version
            shared_path = Path(plugins_base_dir) / "shared" / self.plugin_data['plugin_slug'] / f"v{self.plugin_data['version']}"
        else:
            # When running from the PluginBuild directory during development,
            # resolve the path to backend/plugins/shared
            shared_path = Path(__file__).parent.parent.parent / "backend" / "plugins" / "shared" / self.plugin_data['plugin_slug'] / f"v{self.plugin_data['version']}"
        logger.info(f"BrainDriveOpenAISettings: shared_path - {shared_path}")
        super().__init__(
            plugin_slug=self.plugin_data['plugin_slug'],
            version=self.plugin_data['version'],
            shared_storage_path=shared_path
        )
    
    @property
    def PLUGIN_DATA(self):
        """Compatibility property for remote installer validation"""
        return self.plugin_data
    
    async def get_plugin_metadata(self) -> Dict[str, Any]:
        """Return plugin metadata and configuration"""
        return self.plugin_data
    
    async def get_module_metadata(self) -> list:
        """Return module definitions for this plugin"""
        return self.module_data
    
    async def _perform_user_installation(self, user_id: str, db: AsyncSession, shared_plugin_path: Path) -> Dict[str, Any]:
        """Perform user-specific installation using shared plugin path"""
        try:
            # Create database records for this user
            db_result = await self._create_database_records(user_id, db)
            if not db_result['success']:
                return db_result
            
            logger.info(f"BrainDriveOpenAISettings: User installation completed for {user_id}")
            return {
                'success': True,
                'plugin_id': db_result['plugin_id'],
                'plugin_slug': self.plugin_data['plugin_slug'],
                'plugin_name': self.plugin_data['name'],
                'modules_created': db_result['modules_created']
            }
            
        except Exception as e:
            logger.error(f"BrainDriveOpenAISettings: User installation failed for {user_id}: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _perform_user_uninstallation(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Perform user-specific uninstallation"""
        try:
            # Check if plugin exists for user
            existing_check = await self._check_existing_plugin(user_id, db)
            if not existing_check['exists']:
                return {'success': False, 'error': 'Plugin not found for user'}
            
            plugin_id = existing_check['plugin_id']
            
            # Delete database records
            delete_result = await self._delete_database_records(user_id, plugin_id, db)
            if not delete_result['success']:
                return delete_result
            
            logger.info(f"BrainDriveOpenAISettings: User uninstallation completed for {user_id}")
            return {
                'success': True,
                'plugin_id': plugin_id,
                'deleted_modules': delete_result['deleted_modules']
            }
            
        except Exception as e:
            logger.error(f"BrainDriveOpenAISettings: User uninstallation failed for {user_id}: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _copy_plugin_files_impl(self, user_id: str, target_dir: Path, update: bool = False) -> Dict[str, Any]:
        """
        BrainDriveOpenAISettings-specific implementation of file copying.
        This method is called by the base class during installation.
        Copies all files from the plugin source directory to the target directory.
        """
        try:
            source_dir = Path(__file__).parent
            copied_files = []
            
            # Define files and directories to exclude (similar to build_archive.py)
            exclude_patterns = {
                'node_modules',
                'package-lock.json',
                '.git',
                '.gitignore',
                '__pycache__',
                '*.pyc',
                '.DS_Store',
                'Thumbs.db'
            }
            
            def should_copy(path: Path) -> bool:
                """Check if a file/directory should be copied"""
                # Check if any part of the path matches exclude patterns
                for part in path.parts:
                    if part in exclude_patterns:
                        return False
                # Check for pattern matches
                for pattern in exclude_patterns:
                    if '*' in pattern and path.name.endswith(pattern.replace('*', '')):
                        return False
                return True
            
            # Copy all files and directories recursively
            for item in source_dir.rglob('*'):
                # Skip the lifecycle_manager.py file itself to avoid infinite recursion
                if item.name == 'lifecycle_manager.py' and item == Path(__file__):
                    continue
                    
                # Get relative path from source directory
                relative_path = item.relative_to(source_dir)
                
                # Check if we should copy this item
                if not should_copy(relative_path):
                    continue
                
                target_path = target_dir / relative_path
                
                try:
                    if item.is_file():
                        # Create parent directories if they don't exist
                        target_path.parent.mkdir(parents=True, exist_ok=True)
                        
                        # Copy file
                        if update and target_path.exists():
                            target_path.unlink()  # Remove existing file
                        shutil.copy2(item, target_path)
                        copied_files.append(str(relative_path))
                        logger.debug(f"Copied file: {relative_path}")
                        
                    elif item.is_dir():
                        # Create directory
                        target_path.mkdir(parents=True, exist_ok=True)
                        logger.debug(f"Created directory: {relative_path}")
                        
                except Exception as e:
                    logger.warning(f"Failed to copy {relative_path}: {e}")
                    continue
            
            # Also copy the lifecycle_manager.py file itself
            lifecycle_manager_source = source_dir / 'lifecycle_manager.py'
            lifecycle_manager_target = target_dir / 'lifecycle_manager.py'
            if lifecycle_manager_source.exists():
                lifecycle_manager_target.parent.mkdir(parents=True, exist_ok=True)
                if update and lifecycle_manager_target.exists():
                    lifecycle_manager_target.unlink()
                shutil.copy2(lifecycle_manager_source, lifecycle_manager_target)
                copied_files.append('lifecycle_manager.py')
                logger.info(f"Copied lifecycle_manager.py")
            
            logger.info(f"BrainDriveOpenAISettings: Copied {len(copied_files)} files/directories to {target_dir}")
            return {'success': True, 'copied_files': copied_files}
            
        except Exception as e:
            logger.error(f"BrainDriveOpenAISettings: Error copying plugin files: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _validate_installation_impl(self, user_id: str, plugin_dir: Path) -> Dict[str, Any]:
        """
        BrainDriveOpenAISettings-specific validation logic.
        This method is called by the base class during installation.
        """
        try:
            # Check for BrainDriveOpenAISettings-specific required files
            required_files = ["package.json", "dist/remoteEntry.js"]
            missing_files = []
            
            for file_path in required_files:
                if not (plugin_dir / file_path).exists():
                    missing_files.append(file_path)
            
            if missing_files:
                return {
                    'valid': False,
                    'error': f"BrainDriveOpenAISettings: Missing required files: {', '.join(missing_files)}"
                }
            
            # Validate package.json structure
            package_json_path = plugin_dir / "package.json"
            try:
                with open(package_json_path, 'r') as f:
                    package_data = json.load(f)
                
                # Check for required package.json fields
                required_fields = ["name", "version"]
                for field in required_fields:
                    if field not in package_data:
                        return {
                            'valid': False,
                            'error': f'BrainDriveOpenAISettings: package.json missing required field: {field}'
                        }
                        
            except (json.JSONDecodeError, FileNotFoundError) as e:
                return {
                    'valid': False,
                    'error': f'BrainDriveOpenAISettings: Invalid or missing package.json: {e}'
                }
            
            # Validate bundle file exists and is not empty
            bundle_path = plugin_dir / "dist" / "remoteEntry.js"
            if bundle_path.stat().st_size == 0:
                return {
                    'valid': False,
                    'error': 'BrainDriveOpenAISettings: Bundle file is empty'
                }
            
            # Check for TypeScript source files
            src_dir = plugin_dir / "src"
            if not src_dir.exists():
                return {
                    'valid': False,
                    'error': 'BrainDriveOpenAISettings: Missing src directory'
                }
            
            # Check for main component file
            main_component = src_dir / "OpenAISettings.tsx"
            if not main_component.exists():
                return {
                    'valid': False,
                    'error': 'BrainDriveOpenAISettings: Missing main component file'
                }
            
            logger.info(f"BrainDriveOpenAISettings: Installation validation passed for {user_id}")
            return {'valid': True}
            
        except Exception as e:
            logger.error(f"BrainDriveOpenAISettings: Validation error: {e}")
            return {'valid': False, 'error': str(e)}
    
    async def _get_plugin_health_impl(self, user_id: str, plugin_dir: Path) -> Dict[str, Any]:
        """
        BrainDriveOpenAISettings-specific health check implementation.
        This method is called by the base class during health checks.
        """
        try:
            health_details = []
            healthy = True
            
            # Check if bundle file exists and is readable
            bundle_path = plugin_dir / "dist" / "remoteEntry.js"
            if not bundle_path.exists():
                health_details.append("Bundle file missing")
                healthy = False
            elif bundle_path.stat().st_size == 0:
                health_details.append("Bundle file is empty")
                healthy = False
            else:
                health_details.append("Bundle file is valid")
            
            # Check if package.json is valid
            package_json_path = plugin_dir / "package.json"
            if not package_json_path.exists():
                health_details.append("package.json missing")
                healthy = False
            else:
                try:
                    with open(package_json_path, 'r') as f:
                        json.load(f)
                    health_details.append("package.json is valid")
                except json.JSONDecodeError:
                    health_details.append("package.json is invalid")
                    healthy = False
            
            # Check if source files exist
            src_dir = plugin_dir / "src"
            if not src_dir.exists():
                health_details.append("Source directory missing")
                healthy = False
            else:
                health_details.append("Source directory exists")
            
            # Check for main component
            main_component = src_dir / "OpenAISettings.tsx"
            if not main_component.exists():
                health_details.append("Main component missing")
                healthy = False
            else:
                health_details.append("Main component exists")
            
            # Check for CSS file
            css_file = src_dir / "OpenAISettings.css"
            if not css_file.exists():
                health_details.append("CSS file missing")
                healthy = False
            else:
                health_details.append("CSS file exists")
            
            return {
                'healthy': healthy,
                'details': health_details,
                'timestamp': datetime.datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"BrainDriveOpenAISettings: Health check error: {e}")
            return {
                'healthy': False,
                'details': [f"Health check failed: {str(e)}"],
                'timestamp': datetime.datetime.now().isoformat()
            }
    
    async def _check_existing_plugin(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Check if the plugin is already installed for the user"""
        try:
            # Query for existing plugin installation
            query = text("""
                SELECT p.id, p.name, p.version, p.status, p.created_at, p.updated_at
                FROM plugins p
                WHERE p.user_id = :user_id 
                AND p.slug = :plugin_slug
                AND p.deleted_at IS NULL
                ORDER BY p.created_at DESC
                LIMIT 1
            """)
            
            result = await db.execute(query, {
                'user_id': user_id,
                'plugin_slug': self.plugin_data['plugin_slug']
            })
            
            row = result.fetchone()
            
            if row:
                plugin_info = {
                    'id': row[0],
                    'name': row[1],
                    'version': row[2],
                    'status': row[3],
                    'created_at': row[4].isoformat() if row[4] else None,
                    'updated_at': row[5].isoformat() if row[5] else None
                }
                
                logger.info(f"BrainDriveOpenAISettings: Found existing plugin for {user_id}: {plugin_info}")
                return {
                    'exists': True,
                    'plugin_id': row[0],
                    'plugin_info': plugin_info
                }
            else:
                logger.info(f"BrainDriveOpenAISettings: No existing plugin found for {user_id}")
                return {'exists': False}
                
        except Exception as e:
            logger.error(f"BrainDriveOpenAISettings: Error checking existing plugin: {e}")
            return {'exists': False, 'error': str(e)}
    
    async def _create_database_records(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Create database records for the plugin installation"""
        try:
            # Insert plugin record
            plugin_insert = text("""
                INSERT INTO plugins (
                    user_id, slug, name, description, version, type, icon, category,
                    official, author, compatibility, scope, bundle_method, bundle_location,
                    is_local, long_description, source_type, source_url, update_check_url,
                    installation_type, permissions, created_at, updated_at
                ) VALUES (
                    :user_id, :slug, :name, :description, :version, :type, :icon, :category,
                    :official, :author, :compatibility, :scope, :bundle_method, :bundle_location,
                    :is_local, :long_description, :source_type, :source_url, :update_check_url,
                    :installation_type, :permissions, NOW(), NOW()
                ) RETURNING id
            """)
            
            result = await db.execute(plugin_insert, {
                'user_id': user_id,
                'slug': self.plugin_data['plugin_slug'],
                'name': self.plugin_data['name'],
                'description': self.plugin_data['description'],
                'version': self.plugin_data['version'],
                'type': self.plugin_data['type'],
                'icon': self.plugin_data['icon'],
                'category': self.plugin_data['category'],
                'official': self.plugin_data['official'],
                'author': self.plugin_data['author'],
                'compatibility': self.plugin_data['compatibility'],
                'scope': self.plugin_data['scope'],
                'bundle_method': self.plugin_data['bundle_method'],
                'bundle_location': self.plugin_data['bundle_location'],
                'is_local': self.plugin_data['is_local'],
                'long_description': self.plugin_data['long_description'],
                'source_type': self.plugin_data['source_type'],
                'source_url': self.plugin_data['source_url'],
                'update_check_url': self.plugin_data['update_check_url'],
                'installation_type': self.plugin_data['installation_type'],
                'permissions': json.dumps(self.plugin_data['permissions'])
            })
            
            plugin_id = result.scalar()
            
            # Insert module records
            modules_created = []
            for module in self.module_data:
                module_insert = text("""
                    INSERT INTO plugin_modules (
                        plugin_id, name, display_name, description, icon, category,
                        priority, props, config_fields, messages, required_services,
                        dependencies, layout, tags, created_at, updated_at
                    ) VALUES (
                        :plugin_id, :name, :display_name, :description, :icon, :category,
                        :priority, :props, :config_fields, :messages, :required_services,
                        :dependencies, :layout, :tags, NOW(), NOW()
                    ) RETURNING id
                """)
                
                module_result = await db.execute(module_insert, {
                    'plugin_id': plugin_id,
                    'name': module['name'],
                    'display_name': module['display_name'],
                    'description': module['description'],
                    'icon': module['icon'],
                    'category': module['category'],
                    'priority': module['priority'],
                    'props': json.dumps(module['props']),
                    'config_fields': json.dumps(module['config_fields']),
                    'messages': json.dumps(module['messages']),
                    'required_services': json.dumps(module['required_services']),
                    'dependencies': json.dumps(module['dependencies']),
                    'layout': json.dumps(module['layout']),
                    'tags': json.dumps(module['tags'])
                })
                
                module_id = module_result.scalar()
                modules_created.append({
                    'id': module_id,
                    'name': module['name'],
                    'display_name': module['display_name']
                })
            
            await db.commit()
            
            logger.info(f"BrainDriveOpenAISettings: Created database records for {user_id}, plugin_id: {plugin_id}")
            return {
                'success': True,
                'plugin_id': plugin_id,
                'modules_created': modules_created
            }
            
        except Exception as e:
            await db.rollback()
            logger.error(f"BrainDriveOpenAISettings: Error creating database records: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _delete_database_records(self, user_id: str, plugin_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Delete database records for the plugin"""
        try:
            # Get modules to be deleted
            modules_query = text("""
                SELECT id, name, display_name FROM plugin_modules 
                WHERE plugin_id = :plugin_id
            """)
            
            modules_result = await db.execute(modules_query, {'plugin_id': plugin_id})
            modules = modules_result.fetchall()
            deleted_modules = [{'id': m[0], 'name': m[1], 'display_name': m[2]} for m in modules]
            
            # Delete modules
            module_delete = text("DELETE FROM plugin_modules WHERE plugin_id = :plugin_id")
            await db.execute(module_delete, {'plugin_id': plugin_id})
            
            # Delete plugin
            plugin_delete = text("DELETE FROM plugins WHERE id = :plugin_id AND user_id = :user_id")
            await db.execute(plugin_delete, {'plugin_id': plugin_id, 'user_id': user_id})
            
            await db.commit()
            
            logger.info(f"BrainDriveOpenAISettings: Deleted database records for {user_id}, plugin_id: {plugin_id}")
            return {
                'success': True,
                'deleted_modules': deleted_modules
            }
            
        except Exception as e:
            await db.rollback()
            logger.error(f"BrainDriveOpenAISettings: Error deleting database records: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _export_user_data(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Export user-specific data for backup/migration"""
        try:
            # Get plugin data
            plugin_query = text("""
                SELECT id, slug, name, version, status, created_at, updated_at
                FROM plugins 
                WHERE user_id = :user_id AND slug = :plugin_slug AND deleted_at IS NULL
            """)
            
            plugin_result = await db.execute(plugin_query, {
                'user_id': user_id,
                'plugin_slug': self.plugin_data['plugin_slug']
            })
            
            plugin_row = plugin_result.fetchone()
            if not plugin_row:
                return {'success': False, 'error': 'Plugin not found for user'}
            
            plugin_data = {
                'id': plugin_row[0],
                'slug': plugin_row[1],
                'name': plugin_row[2],
                'version': plugin_row[3],
                'status': plugin_row[4],
                'created_at': plugin_row[5].isoformat() if plugin_row[5] else None,
                'updated_at': plugin_row[6].isoformat() if plugin_row[6] else None
            }
            
            # Get module data
            modules_query = text("""
                SELECT name, display_name, description, icon, category, priority,
                       props, config_fields, messages, required_services, dependencies,
                       layout, tags, created_at, updated_at
                FROM plugin_modules 
                WHERE plugin_id = :plugin_id
            """)
            
            modules_result = await db.execute(modules_query, {'plugin_id': plugin_row[0]})
            modules = []
            
            for row in modules_result.fetchall():
                module_data = {
                    'name': row[0],
                    'display_name': row[1],
                    'description': row[2],
                    'icon': row[3],
                    'category': row[4],
                    'priority': row[5],
                    'props': json.loads(row[6]) if row[6] else {},
                    'config_fields': json.loads(row[7]) if row[7] else {},
                    'messages': json.loads(row[8]) if row[8] else {},
                    'required_services': json.loads(row[9]) if row[9] else {},
                    'dependencies': json.loads(row[10]) if row[10] else [],
                    'layout': json.loads(row[11]) if row[11] else {},
                    'tags': json.loads(row[12]) if row[12] else [],
                    'created_at': row[13].isoformat() if row[13] else None,
                    'updated_at': row[14].isoformat() if row[14] else None
                }
                modules.append(module_data)
            
            user_data = {
                'plugin': plugin_data,
                'modules': modules,
                'exported_at': datetime.datetime.now().isoformat(),
                'plugin_slug': self.plugin_data['plugin_slug'],
                'version': self.plugin_data['version']
            }
            
            logger.info(f"BrainDriveOpenAISettings: Exported user data for {user_id}")
            return {'success': True, 'user_data': user_data}
            
        except Exception as e:
            logger.error(f"BrainDriveOpenAISettings: Error exporting user data: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _import_user_data(self, user_id: str, db: AsyncSession, user_data: Dict[str, Any]):
        """Import user-specific data from backup/migration"""
        try:
            if not user_data or 'plugin' not in user_data:
                logger.warning(f"BrainDriveOpenAISettings: No valid user data to import for {user_id}")
                return
            
            # Update existing plugin with imported data
            plugin_update = text("""
                UPDATE plugins 
                SET status = :status, updated_at = NOW()
                WHERE user_id = :user_id AND slug = :plugin_slug AND deleted_at IS NULL
            """)
            
            await db.execute(plugin_update, {
                'status': user_data['plugin'].get('status', 'active'),
                'user_id': user_id,
                'plugin_slug': self.plugin_data['plugin_slug']
            })
            
            # Update module configurations
            for module_data in user_data.get('modules', []):
                module_name = module_data.get('name')
                if not module_name:
                    continue
                
                module_update = text("""
                    UPDATE plugin_modules 
                    SET config_fields = :config_fields, updated_at = NOW()
                    WHERE plugin_id IN (
                        SELECT id FROM plugins 
                        WHERE user_id = :user_id AND slug = :plugin_slug AND deleted_at IS NULL
                    ) AND name = :module_name
                """)
                
                await db.execute(module_update, {
                    'config_fields': json.dumps(module_data.get('config_fields', {})),
                    'user_id': user_id,
                    'plugin_slug': self.plugin_data['plugin_slug'],
                    'module_name': module_name
                })
            
            logger.info(f"BrainDriveOpenAISettings: Imported user data for {user_id}")
            
        except Exception as e:
            logger.error(f"BrainDriveOpenAISettings: Error importing user data: {e}")
            raise
    
    def get_plugin_info(self) -> Dict[str, Any]:
        """Get plugin information (compatibility method)"""
        return self.plugin_data
    
    @property
    def MODULE_DATA(self):
        """Compatibility property for accessing module data"""
        return self.module_data
    
    # Compatibility methods for old interface
    async def install_plugin(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Install BrainDriveOpenAISettings plugin for specific user (compatibility method)"""
        try:
            logger.info(f"BrainDriveOpenAISettings: Starting installation for user {user_id}")
            
            # Check if plugin is already installed for this user
            existing_check = await self._check_existing_plugin(user_id, db)
            if existing_check['exists']:
                logger.warning(f"BrainDriveOpenAISettings: Plugin already installed for user {user_id}")
                return {
                    'success': False,
                    'error': 'Plugin already installed for user',
                    'plugin_id': existing_check['plugin_id']
                }
            
            shared_path = self.shared_path
            shared_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"BrainDriveOpenAISettings: Created shared directory: {shared_path}")

            # Copy plugin files to the shared directory first
            copy_result = await self._copy_plugin_files_impl(user_id, shared_path)
            if not copy_result['success']:
                logger.error(f"BrainDriveOpenAISettings: File copying failed: {copy_result.get('error')}")
                return copy_result

            logger.info(f"BrainDriveOpenAISettings: Files copied successfully, proceeding with database installation")
            
            # Ensure we're in a transaction
            try:
                result = await self.install_for_user(user_id, db, shared_path)
                
                if result.get('success'):
                    # Verify the installation was successful
                    verify_check = await self._check_existing_plugin(user_id, db)
                    if not verify_check['exists']:
                        logger.error(f"BrainDriveOpenAISettings: Installation appeared successful but verification failed")
                        return {'success': False, 'error': 'Installation verification failed'}
                    
                    logger.info(f"BrainDriveOpenAISettings: Installation verified successfully for user {user_id}")
                    result.update({
                        'plugin_slug': self.plugin_data['plugin_slug'],
                        'plugin_name': self.plugin_data['name']
                    })
                else:
                    logger.error(f"BrainDriveOpenAISettings: Database installation failed: {result.get('error')}")
                
                return result
                
            except Exception as db_error:
                logger.error(f"BrainDriveOpenAISettings: Database operation failed: {db_error}")
                # Try to rollback if possible
                try:
                    await db.rollback()
                except:
                    pass
                return {'success': False, 'error': f'Database operation failed: {str(db_error)}'}
                
        except Exception as e:
            logger.error(f"BrainDriveOpenAISettings: Install plugin failed: {e}")
            return {'success': False, 'error': str(e)}
    
    async def delete_plugin(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Delete BrainDriveOpenAISettings plugin for user (compatibility method)"""
        try:
            logger.info(f"BrainDriveOpenAISettings: Starting deletion for user {user_id}")
            
            # Let the base class handle the deletion - it will call _perform_user_uninstallation
            # which includes the database check
            result = await self.uninstall_for_user(user_id, db)
            
            if result.get('success'):
                logger.info(f"BrainDriveOpenAISettings: Successfully deleted plugin for user {user_id}")
            else:
                logger.error(f"BrainDriveOpenAISettings: Deletion failed: {result.get('error')}")
            
            return result
        except Exception as e:
            logger.error(f"BrainDriveOpenAISettings: Delete plugin failed: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_plugin_status(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Get current status of BrainDriveOpenAISettings plugin installation (compatibility method)"""
        try:
            existing_check = await self._check_existing_plugin(user_id, db)
            if not existing_check['exists']:
                return {'exists': False, 'status': 'not_installed'}
            
            # Check if shared plugin files exist
            plugin_health = await self._get_plugin_health_impl(user_id, self.shared_path)
            
            return {
                'exists': True,
                'status': 'healthy' if plugin_health['healthy'] else 'unhealthy',
                'plugin_id': existing_check['plugin_id'],
                'plugin_info': existing_check['plugin_info'],
                'health_details': plugin_health['details']
            }
            
        except Exception as e:
            logger.error(f"BrainDriveOpenAISettings: Error checking plugin status: {e}")
            return {'exists': False, 'status': 'error', 'error': str(e)}
    
    async def update_plugin(self, user_id: str, db: AsyncSession, new_version_manager: 'BrainDriveOpenAISettingsLifecycleManager') -> Dict[str, Any]:
        """Update BrainDriveOpenAISettings plugin for user (compatibility method)"""
        try:
            # Export current user data
            export_result = await self._export_user_data(user_id, db)
            if not export_result['success']:
                return export_result
            
            # Uninstall current version
            uninstall_result = await self.uninstall_for_user(user_id, db)
            if not uninstall_result['success']:
                return uninstall_result
            
            # Install new version
            install_result = await new_version_manager.install_for_user(user_id, db, new_version_manager.shared_path)
            if not install_result['success']:
                return install_result
            
            # Import user data to new version
            await new_version_manager._import_user_data(user_id, db, export_result.get('user_data', {}))
            
            logger.info(f"BrainDriveOpenAISettings: Plugin updated successfully for user {user_id}")
            return {
                'success': True,
                'old_version': self.version,
                'new_version': new_version_manager.version,
                'plugin_id': install_result['plugin_id']
            }
            
        except Exception as e:
            logger.error(f"BrainDriveOpenAISettings: Plugin update failed for user {user_id}: {e}")
            return {'success': False, 'error': str(e)}


# Standalone functions for compatibility with remote installer
async def install_plugin(user_id: str, db: AsyncSession, plugins_base_dir: str = None) -> Dict[str, Any]:
    manager = BrainDriveOpenAISettingsLifecycleManager(plugins_base_dir)
    return await manager.install_plugin(user_id, db)

async def delete_plugin(user_id: str, db: AsyncSession, plugins_base_dir: str = None) -> Dict[str, Any]:
    manager = BrainDriveOpenAISettingsLifecycleManager(plugins_base_dir)
    return await manager.delete_plugin(user_id, db)

async def get_plugin_status(user_id: str, db: AsyncSession, plugins_base_dir: str = None) -> Dict[str, Any]:
    manager = BrainDriveOpenAISettingsLifecycleManager(plugins_base_dir)
    return await manager.get_plugin_status(user_id, db)

async def update_plugin(user_id: str, db: AsyncSession, new_version_manager: 'BrainDriveOpenAISettingsLifecycleManager', plugins_base_dir: str = None) -> Dict[str, Any]:
    old_manager = BrainDriveOpenAISettingsLifecycleManager(plugins_base_dir)
    return await old_manager.update_plugin(user_id, db, new_version_manager)


# Test script for development
if __name__ == "__main__":
    import sys
    import asyncio
    
    async def main():
        print("BrainDriveOpenAISettings Plugin Lifecycle Manager - Test Mode")
        print("=" * 60)
        
        # Test manager initialization
        manager = BrainDriveOpenAISettingsLifecycleManager()
        print(f"Plugin: {manager.plugin_data['name']}")
        print(f"Version: {manager.plugin_data['version']}")
        print(f"Slug: {manager.plugin_data['plugin_slug']}")
        print(f"Modules: {len(manager.module_data)}")
        
        for module in manager.module_data:
            print(f"  - {module['display_name']} ({module['name']})")
        
        print(f"\nRequired Services:")
        for service_name, service_info in manager.module_data[0]['required_services'].items():
            print(f"  - {service_name}: {service_info['methods']}")
        
        print(f"\nConfig Fields:")
        for field_name, field_info in manager.module_data[0]['config_fields'].items():
            print(f"  - {field_name}: {field_info['type']} ({field_info['description']})")
    
    asyncio.run(main()) 