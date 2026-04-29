from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from ..models import Team, WorkforceMember
from ..serializers.team_serializers import TeamSerializer


class TeamViewSet(viewsets.ModelViewSet):
    serializer_class = TeamSerializer
    queryset         = Team.objects.all()

    def get_queryset(self):
        qs = Team.objects.prefetch_related('members', 'leader')
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    @action(detail=True, methods=['post'])
    def add_members(self, request, pk=None):
        team       = self.get_object()
        member_ids = request.data.get('member_ids', [])
        if not member_ids:
            return Response(
                {'error': 'No member_ids provided'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        members = WorkforceMember.objects.filter(
            id__in=member_ids,
            current_project=team.project,
        )
        team.members.add(*members)
        return Response({'message': f'Added {members.count()} members to {team.name}'})

    @action(detail=True, methods=['post'])
    def remove_members(self, request, pk=None):
        team       = self.get_object()
        member_ids = request.data.get('member_ids', [])
        if not member_ids:
            return Response(
                {'error': 'No member_ids provided'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        team.members.remove(*member_ids)
        return Response({'message': f'Removed members from {team.name}'})
