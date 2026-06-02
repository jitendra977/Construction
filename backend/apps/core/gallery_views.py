from rest_framework import viewsets, response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.db.models import Q
from itertools import chain
from .gallery_serializers import GalleryItemSerializer
from apps.permits.models import PermitDocument
from apps.tasks.models import TaskMedia
from apps.core.models import ConstructionPhase, PhaseDocument, Floor
import datetime

class GalleryViewSet(viewsets.ViewSet):
    """
    Unified Construction Archive for all project media.
    Supports views: 'timeline' (all photos), 'phases' (grouped by phase), 'blueprints' (tech docs), 'permits' (legal).
    """
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        view_mode = request.query_params.get('group_by', 'timeline') # renamed 'group_by' to 'view_mode' conceptualy, keeping param name for compatibility
        
        # Helper to get phase order map
        phase_map = {p.id: {'name': p.name, 'order': p.order} for p in ConstructionPhase.objects.all()}
        
        items = []

        # --- 1. Fetch & Normalize Data ---

        # A. Permit Documents (Legal & Blueprint docs — sourced from permits app)
        for doc in PermitDocument.objects.all():
            if not doc.file: continue
            
            is_legal = doc.document_type in ['NAKSHA', 'LALPURJA', 'NAGRIKTA', 'TIRO', 'CHARKILLA', 'PERMIT']
            
            items.append({
                'id': f"doc_{doc.id}",
                'url': doc.file.url,
                'title': doc.title,
                'subtitle': doc.get_document_type_display(),
                'category': 'Permit' if is_legal else 'Document',
                'uploaded_at': doc.uploaded_at,
                'source_type': 'LEGAL_DOC' if is_legal else 'DOCUMENT',
                'media_type': self._get_file_type(doc.file.name),
                'meta': {'doc_id': doc.id}
            })
            
        # B. Task Media (Updates)
        for tm in TaskMedia.objects.select_related('task', 'task__phase').all():
            if not tm.file: continue
            
            if tm.task:
                phase_id = tm.task.phase.id if tm.task.phase else 0
                title = tm.task.title
                status = tm.task.status
                subtitle = f"Phase {phase_map.get(phase_id, {'order': 99})['order']}: {phase_map.get(phase_id, {'name': 'Unassigned'})['name']}"
                category = 'Task Update'
            else:
                phase_id = 0
                title = "Telegram Upload"
                status = "N/A"
                subtitle = "Direct from Bot"
                category = 'Site Photo'

            items.append({
                'id': f"task_{tm.id}",
                'url': tm.file.url,
                'title': title,
                'subtitle': subtitle,
                'category': category,
                'uploaded_at': tm.created_at,
                'source_type': 'TASK_MEDIA',
                'media_type': tm.media_type, # IMAGE/VIDEO
                'telegram_uploader_name': getattr(tm, 'telegram_uploader_name', None),
                'description': tm.description,
                'meta': {
                    'task_id': tm.task.id if tm.task else None,
                    'phase_id': phase_id,
                    'task_status': status,
                }
            })
            
        # C. Phase Files (Naksa, Design, Photos)
        for p in ConstructionPhase.objects.all():
            # Blueprint (Naksa)
            if p.naksa_file:
                items.append({
                    'id': f"phase_naksa_{p.id}",
                    'url': p.naksa_file.url,
                    'title': f"{p.name} - Blueprint",
                    'subtitle': "Approved Layout",
                    'category': 'Blueprint',
                    'uploaded_at': p.start_date or datetime.datetime.now(), # Fallback
                    'source_type': 'PHASE_NAKSA',
                    'media_type': self._get_file_type(p.naksa_file.name),
                    'meta': {'phase_id': p.id}
                })
            # Structure Design
            if p.structure_design:
                 items.append({
                    'id': f"phase_struct_{p.id}",
                    'url': p.structure_design.url,
                    'title': f"{p.name} - Structure",
                    'subtitle': "Structural Design",
                    'category': 'Design',
                    'uploaded_at': p.start_date or datetime.datetime.now(),
                    'source_type': 'PHASE_DESIGN',
                    'media_type': self._get_file_type(p.structure_design.name),
                    'meta': {'phase_id': p.id}
                })
            # Completion Photo
            if p.completion_photo:
                items.append({
                    'id': f"phase_photo_{p.id}",
                    'url': p.completion_photo.url,
                    'title': f"{p.name} - Completion",
                    'subtitle': "Phase Completed",
                    'category': 'Site Photo',
                    'uploaded_at': p.end_date or datetime.datetime.now(),
                    'source_type': 'PHASE_PHOTO',
                    'media_type': 'IMAGE',
                    'meta': {'phase_id': p.id}
                })

        # C2. Multi-file phase documents (Naksa, structural files, 3D models)
        document_category = {
            'NAKSA': 'Blueprint',
            'STRUCTURE': 'Design',
            '3D_MODEL': '3D Model',
            'OTHER': 'Document',
        }
        for doc in PhaseDocument.objects.select_related('phase').all():
            if not doc.file:
                continue

            phase_name = doc.phase.name if doc.phase else 'Unassigned Phase'
            display_type = doc.get_document_type_display()
            items.append({
                'id': f"phase_doc_{doc.id}",
                'url': doc.file.url,
                'title': doc.name or f"{phase_name} - {display_type}",
                'subtitle': f"{phase_name} • {display_type}",
                'category': document_category.get(doc.document_type, 'Document'),
                'uploaded_at': doc.uploaded_at,
                'source_type': 'PHASE_DOCUMENT',
                'media_type': self._get_file_type(doc.file.name),
                'meta': {
                    'phase_id': doc.phase.id if doc.phase else None,
                    'phase_document_id': doc.id,
                    'document_type': doc.document_type,
                }
            })

        # D. Floor Plans
        for f in Floor.objects.all():
            if f.image:
                items.append({
                    'id': f"floor_{f.id}",
                    'url': f.image.url,
                    'title': f"{f.name} Plan",
                    'subtitle': "Architectural Plan",
                    'category': 'Floor Plan',
                    'uploaded_at': f.created_at,
                    'source_type': 'FLOOR_PLAN',
                    'media_type': 'IMAGE',
                    'meta': {'floor_id': f.id}
                })


        # --- 2. Filter & Group Data based on View Mode ---
        
        grouped_data = {}
        
        # Helper: Get Date Key
        def get_date_key(date_val):
            if not date_val: return 'Archive'
            if hasattr(date_val, 'strftime'): return date_val.strftime('%Y-%m-%d')
            return str(date_val)[:10]

        if view_mode == 'timeline':
            # "Google Photos" style: All IMAGES grouped by Date
            # Filter: Only Images/Videos
            filtered = [i for i in items if i['media_type'] in ['IMAGE', 'VIDEO']]
            for item in filtered:
                key = get_date_key(item.get('uploaded_at'))
                if key not in grouped_data: grouped_data[key] = []
                grouped_data[key].append(item)

        elif view_mode == 'phases':
            # Group progress photos by Phase
            # Includes: all task media + phase completion photos
            filtered = [
                i for i in items
                if 'phase_id' in i.get('meta', {})
                and i['media_type'] in ['IMAGE', 'VIDEO']
                and i['source_type'] in ['TASK_MEDIA', 'PHASE_PHOTO']
            ]
            for item in filtered:
                p_id = item['meta']['phase_id']
                p_info = phase_map.get(p_id)
                key = f"{p_info['order']}. {p_info['name']}" if p_info else 'Unassigned Album'
                if key not in grouped_data: grouped_data[key] = []
                grouped_data[key].append(item)

        elif view_mode == 'blueprints':
            # Group by Type (Naksa, Structure, Floor Plan)
            # Includes: Naksa, Structure, 3D Models, Floor Plans
            target_sources = ['PHASE_NAKSA', 'PHASE_DESIGN', 'PHASE_DOCUMENT', 'FLOOR_PLAN']
            filtered = [i for i in items if i['source_type'] in target_sources or i['category'] in ['Blueprint', 'Design', '3D Model']]
            for item in filtered:
                key = item['category'] # e.g., 'Blueprint', 'Design', 'Floor Plan'
                if key not in grouped_data: grouped_data[key] = []
                grouped_data[key].append(item)

        elif view_mode == 'permits':
            # Group by Document Type
            # Includes: Legal Docs
            filtered = [i for i in items if i['source_type'] in ['LEGAL_DOC', 'DOCUMENT'] and i['media_type'] == 'PDF' or i['category'] == 'Permit']
            for item in filtered:
                key = item['category']
                if key not in grouped_data: grouped_data[key] = []
                grouped_data[key].append(item)
                
        else:
             # Default Fallback (Timeline)
            filtered = [i for i in items if i['media_type'] in ['IMAGE', 'VIDEO']]
            for item in filtered:
                key = get_date_key(item.get('uploaded_at'))
                if key not in grouped_data: grouped_data[key] = []
                grouped_data[key].append(item)

        # --- 3. Format Response ---
        response_data = []
        for group_name, group_items in grouped_data.items():
            # Sort items by date desc
            group_items.sort(key=lambda x: str(x.get('uploaded_at', '') or ''), reverse=True)
            response_data.append({
                'groupName': group_name,
                'items': group_items
            })
            
        # Sort Groups: 
        # For Phases, we want order 1, 2, 3...
        # For Dates, we want Newest first
        reverse_sort = True
        if view_mode == 'phases': reverse_sort = False # 1 before 2
        
        response_data.sort(key=lambda x: x['groupName'], reverse=reverse_sort)

        return response.Response(response_data)

    def _get_file_type(self, filename):
        if not filename:
            return 'FILE'
        ext = filename.split('.')[-1].lower() if '.' in filename else ''
        if ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
            return 'IMAGE'
        elif ext in ['pdf']:
            return 'PDF'
        elif ext in ['mp4', 'mov', 'avi']:
            return 'VIDEO'
        elif ext in ['glb', 'gltf', 'obj', 'fbx', 'skp', 'dwg', 'dxf', 'rvt', 'ifc']:
            return 'FILE'
        return 'FILE'
