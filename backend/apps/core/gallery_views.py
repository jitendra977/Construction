from rest_framework import viewsets, response
from rest_framework.decorators import action
from django.db.models import Q
from itertools import chain
from .gallery_serializers import GalleryItemSerializer
from apps.resources.models import Document
from apps.tasks.models import TaskMedia
from apps.core.models import ConstructionPhase, Floor
from apps.permits.models import LegalDocument
import datetime

class GalleryViewSet(viewsets.ViewSet):
    """
    Unified Construction Archive for all project media.
    Supports views: 'timeline' (all photos), 'phases' (grouped by phase), 'blueprints' (tech docs), 'permits' (legal).
    """
    
    def list(self, request):
        view_mode = request.query_params.get('group_by', 'timeline') # renamed 'group_by' to 'view_mode' conceptualy, keeping param name for compatibility
        
        # Helper to get phase order map
        phase_map = {p.id: {'name': p.name, 'order': p.order} for p in ConstructionPhase.objects.all()}
        
        items = []

        # --- 1. Fetch & Normalize Data ---

        # A. Documents (Generic)
        for doc in Document.objects.all():
            if not doc.file: continue
            items.append({
                'id': f"doc_{doc.id}",
                'url': doc.file.url,
                'title': doc.title,
                'subtitle': doc.get_document_type_display(),
                'category': 'Document',
                'uploaded_at': doc.uploaded_at,
                'source_type': 'DOCUMENT',
                'media_type': self._get_file_type(doc.file.name),
                'meta': {'doc_id': doc.id}
            })
            
        # B. Task Media (Updates)
        for tm in TaskMedia.objects.select_related('task', 'task__phase').all():
            if not tm.file: continue
            phase_id = tm.task.phase.id if tm.task.phase else 0
            phase_info = phase_map.get(phase_id, {'name': 'Unassigned', 'order': 99})
            items.append({
                'id': f"task_{tm.id}",
                'url': tm.file.url,
                'title': tm.task.title,
                'subtitle': f"Phase {phase_info['order']}: {phase_info['name']}",
                'category': 'Task Update',
                'uploaded_at': tm.created_at,
                'source_type': 'TASK_MEDIA',
                'media_type': tm.media_type, # IMAGE/VIDEO
                'meta': {'task_id': tm.task.id, 'phase_id': phase_id}
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

        # E. Legal Documents (Permits)
        for p in LegalDocument.objects.all():
            if p.file:
                items.append({
                    'id': f"permit_{p.id}",
                    'url': p.file.url,
                    'title': p.title,
                    'subtitle': p.get_document_type_display(),
                    'category': 'Permit',
                    'uploaded_at': p.upload_date, # Fixed field name
                    'source_type': 'LEGAL_DOC',
                    'media_type': self._get_file_type(p.file.name),
                    'meta': {'permit_id': p.id}
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
            # Group by Phase
            # Includes: Phase Files, Task Media
            filtered = [i for i in items if i.get('meta',{}).get('phase_id')]
            for item in filtered:
                p_id = item['meta']['phase_id']
                p_info = phase_map.get(p_id, {'name': 'Unassigned', 'order': 99})
                key = f"{p_info['order']}. {p_info['name']}"
                if key not in grouped_data: grouped_data[key] = []
                grouped_data[key].append(item)

        elif view_mode == 'blueprints':
            # Group by Type (Naksa, Structure, Floor Plan)
            # Includes: Naksa, Structure, Floor Plans
            target_sources = ['PHASE_NAKSA', 'PHASE_DESIGN', 'FLOOR_PLAN']
            filtered = [i for i in items if i['source_type'] in target_sources or i['category'] == 'Blueprint']
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
        return 'FILE'
