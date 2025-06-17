from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from .models import Example
from .serializers import ExampleSerializer

# Create your views here.

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    A simple health check endpoint to verify the API is working
    """
    return JsonResponse({
        'status': 'ok',
        'message': 'API is running'
    })

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def example_list(request):
    """
    List all examples or create a new example
    """
    if request.method == 'GET':
        examples = Example.objects.all()
        serializer = ExampleSerializer(examples, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = ExampleSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def example_detail(request, pk):
    """
    Retrieve, update or delete an example
    """
    try:
        example = Example.objects.get(pk=pk)
    except Example.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = ExampleSerializer(example)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = ExampleSerializer(example, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        example.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
