from rest_framework import viewsets, response
from rest_framework.decorators import action
from django.db.models import Q
from itertools import chain
from .gallery_serializers import GalleryItemSerializer
from apps.resources.models import Document
from apps.tasks.models import TaskMedia
from apps.core.models import ConstructionPhase, Floor
from apps.permits.models import LegalDocument

class GalleryViewSet(viewsets.ViewSet):
    """
    Unified viewport for all media files across the construction project.
    """
    
    def list(self, request):
        group_by = request.query_params.get('group_by', 'category') # Default grouping
        
        # Helper to get phase order map
        phase_orders = {p.name: p.order for p in ConstructionPhase.objects.all()}
        
        items = []
        
        # 1. Documents (Photos, Bills, etc.)
        docs = Document.objects.all()
        for doc in docs:
            item = {
                'id': f"doc_{doc.id}",
                'url': doc.file.url if doc.file else None,
                'title': doc.title,
                'category': doc.get_document_type_display(),
                'uploaded_at': doc.uploaded_at,
                'source_type': 'DOCUMENT',
                'file_type': self._get_file_type(doc.file.name)
            }
            items.append(item)
            
        # 2. Task Media
        task_media = TaskMedia.objects.select_related('task', 'task__phase').all()
        for tm in task_media:
            item = {
                'id': f"task_{tm.id}",
                'url': tm.file.url if tm.file else None,
                'title': f"Task: {tm.task.title}",
                'category': 'Task Update',
                'group_name': tm.task.phase.name if tm.task.phase else 'Unassigned',
                'uploaded_at': tm.created_at,
                'source_type': 'TASK_MEDIA',
                'file_type': tm.media_type
            }
            items.append(item)
            
        # 3. Construction Phase Files
        phases = ConstructionPhase.objects.all()
        for p in phases:
            if p.naksa_file:
                items.append({
                    'id': f"phase_naksa_{p.id}",
                    'url': p.naksa_file.url,
                    'title': f"Naksa - {p.name}",
                    'category': 'Blueprint',
                    'group_name': p.name,
                    'uploaded_at': None, # Phases might not have separate upload dates, using None
                    'source_type': 'PHASE_FILE',
                    'file_type': self._get_file_type(p.naksa_file.name)
                })
            if p.structure_design:
                items.append({
                    'id': f"phase_struct_{p.id}",
                    'url': p.structure_design.url,
                    'title': f"Structure Design - {p.name}",
                    'category': 'Design',
                    'group_name': p.name,
                    'uploaded_at': None,
                    'source_type': 'PHASE_FILE',
                    'file_type': self._get_file_type(p.structure_design.name)
                })
            if p.completion_photo:
                items.append({
                    'id': f"phase_photo_{p.id}",
                    'url': p.completion_photo.url,
                    'title': f"Completion - {p.name}",
                    'category': 'Phase Photo',
                    'group_name': p.name,
                    'uploaded_at': None,
                    'source_type': 'PHASE_FILE',
                    'file_type': 'IMAGE'
                })
                
        # 4. Floor Plans
        floors = Floor.objects.all()
        for f in floors:
            if f.image:
                items.append({
                    'id': f"floor_{f.id}",
                    'url': f.image.url,
                    'title': f"Plan - {f.name}",
                    'category': 'Floor Plan',
                    'group_name': 'Architectural',
                    'uploaded_at': f.created_at,
                    'source_type': 'FLOOR_PLAN',
                    'file_type': 'IMAGE'
                })

        # 5. Legal Documents
        legal_docs = LegalDocument.objects.all()
        for ldoc in legal_docs:
            items.append({
                'id': f"legal_{ldoc.id}",
                'url': ldoc.file.url if ldoc.file else None,
                'title': ldoc.title,
                'category': ldoc.get_document_type_display(),
                'uploaded_at': ldoc.upload_date,
                'source_type': 'LEGAL_DOC',
                'file_type': self._get_file_type(ldoc.file.name)
            })

        # Process Grouping
        grouped_data = {}
        
        # Specific filtering for 'task' and 'engineering' to remove noise
        filtered_items = []
        if group_by == 'task':
            filtered_items = [i for i in items if i.get('source_type') == 'TASK_MEDIA']
        elif group_by == 'engineering':
             filtered_items = [i for i in items if i.get('category') in ['Blueprint', 'Design', 'Floor Plan', 'Naksa (Blueprint/Map)']]
        elif group_by == 'none':
             filtered_items = items # All items
        else:
             filtered_items = items # All items for phase/category/date

        if not filtered_items:
             return response.Response([])

        # If group_by is none, return flat list immediately
        if group_by == 'none':
            sorted_items = sorted(filtered_items, key=lambda x: x['uploaded_at'].isoformat() if x.get('uploaded_at') else '', reverse=True)
            return response.Response([{
                'group': 'All Media',
                'items': sorted_items
            }])

        for item in filtered_items:
            g_key = 'Uncategorized'
            if group_by == 'phase':
                g_key = item.get('group_name') or 'General'
            elif group_by == 'task':
                g_key = item.get('title').replace('Task: ', '') or 'General Task'
            elif group_by == 'engineering':
                g_key = item.get('group_name') or 'General Engineering'
            elif group_by == 'category':
                g_key = item.get('category') or 'Other'
            elif group_by == 'date':
                if item.get('uploaded_at'):
                    g_key = item['uploaded_at'].strftime('%Y-%m')
                else:
                    g_key = 'Legacy/System'
            
            if g_key not in grouped_data:
                grouped_data[g_key] = []
            grouped_data[g_key].append(item)

        final_response = []
        
        # Sort logic
        def get_group_sort_key(g_name):
            if group_by in ['phase', 'engineering']:
                # Return tuple (order, name) effectively sorting by order then name
                # Default order 9999 for items without a phase mapping
                return (phase_orders.get(g_name, 9999), g_name)
            return g_name

        for g_name in sorted(grouped_data.keys(), key=get_group_sort_key):
            sorted_group_items = sorted(grouped_data[g_name], key=lambda x: x['uploaded_at'].isoformat() if x.get('uploaded_at') else '', reverse=True)
            
            # Prepend order number for phase-based views to show timeline
            display_name = g_name
            if group_by in ['phase', 'engineering']:
                order = phase_orders.get(g_name)
                if order is not None:
                    # Format as "01. Phase Name" for better alignment if needed, or just "1. Phase Name"
                    display_name = f"{order}. {g_name}"

            final_response.append({
                'group': display_name,
                'items': sorted_group_items
            })

        return response.Response(final_response)

    def _get_file_type(self, filename):
        if not filename: return 'OTHER'
        ext = filename.split('.')[-1].lower()
        if ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
            return 'IMAGE'
        if ext == 'pdf':
            return 'PDF'
        if ext in ['mp4', 'mov', 'avi']:
            return 'VIDEO'
        return 'OTHER'
