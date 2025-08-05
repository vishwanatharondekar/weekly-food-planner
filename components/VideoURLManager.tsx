import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ExternalLink, Youtube } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { isValidYouTubeURL, extractYouTubeVideoID } from '@/lib/video-url-utils';
import toast from 'react-hot-toast';

interface VideoURLManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VideoURL {
  recipeName: string;
  videoUrl: string;
}

export default function VideoURLManager({ isOpen, onClose }: VideoURLManagerProps) {
  const [videoURLs, setVideoURLs] = useState<{ [recipeName: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<string | null>(null);
  const [newRecipeName, setNewRecipeName] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadVideoURLs();
    }
  }, [isOpen]);

  const loadVideoURLs = async () => {
    try {
      setLoading(true);
      const urls = await authAPI.getVideoURLs();
      setVideoURLs(urls);
    } catch (error) {
      console.error('Failed to load video URLs:', error);
      toast.error('Failed to load video URLs');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVideoURL = async () => {
    if (!newRecipeName.trim() || !newVideoUrl.trim()) {
      toast.error('Please enter both recipe name and video URL');
      return;
    }

    if (!isValidYouTubeURL(newVideoUrl)) {
      toast.error('Please enter a valid YouTube URL');
      return;
    }

    try {
      setLoading(true);
      await authAPI.saveVideoURL(newRecipeName.trim(), newVideoUrl.trim());
      
      // Reload the list
      await loadVideoURLs();
      
      // Reset form
      setNewRecipeName('');
      setNewVideoUrl('');
      setShowAddForm(false);
      
      toast.success(`Video URL saved for "${newRecipeName.trim()}"`);
    } catch (error) {
      console.error('Failed to save video URL:', error);
      toast.error('Failed to save video URL');
    } finally {
      setLoading(false);
    }
  };

  const handleEditVideoURL = async (recipeName: string, newVideoUrl: string) => {
    if (!isValidYouTubeURL(newVideoUrl)) {
      toast.error('Please enter a valid YouTube URL');
      return;
    }

    try {
      setLoading(true);
      await authAPI.saveVideoURL(recipeName, newVideoUrl.trim());
      
      // Reload the list
      await loadVideoURLs();
      setEditingRecipe(null);
      
      toast.success(`Video URL updated for "${recipeName}"`);
    } catch (error) {
      console.error('Failed to update video URL:', error);
      toast.error('Failed to update video URL');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideoURL = async (recipeName: string) => {
    if (!confirm(`Are you sure you want to delete the video URL for "${recipeName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      // For now, we'll save an empty string to "delete" it
      // In a real implementation, you might want a proper DELETE endpoint
      await authAPI.saveVideoURL(recipeName, '');
      
      // Reload the list
      await loadVideoURLs();
      
      toast.success(`Video URL deleted for "${recipeName}"`);
    } catch (error) {
      console.error('Failed to delete video URL:', error);
      toast.error('Failed to delete video URL');
    } finally {
      setLoading(false);
    }
  };

  const openVideoInNewTab = (videoUrl: string) => {
    window.open(videoUrl, '_blank');
  };

  const getVideoThumbnail = (videoUrl: string) => {
    const videoId = extractYouTubeVideoID(videoUrl);
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Youtube className="w-5 h-5 mr-2 text-red-600" />
            Recipe Video URLs
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Add New Video URL */}
              {showAddForm && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Recipe Video</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Recipe Name
                      </label>
                      <input
                        type="text"
                        value={newRecipeName}
                        onChange={(e) => setNewRecipeName(e.target.value)}
                        placeholder="e.g., Poha, Chicken Curry"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        YouTube Video URL
                      </label>
                      <input
                        type="url"
                        value={newVideoUrl}
                        onChange={(e) => setNewVideoUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleAddVideoURL}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Video URLs List */}
              <div className="space-y-4">
                {Object.keys(videoURLs).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Youtube className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No recipe videos saved yet.</p>
                    <p className="text-sm">Add your favorite recipe videos to quickly access them when planning meals.</p>
                  </div>
                ) : (
                  Object.entries(videoURLs).map(([recipeName, videoUrl]) => (
                    <div key={recipeName} className="border rounded-lg p-4">
                      {editingRecipe === recipeName ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Recipe Name
                            </label>
                            <input
                              type="text"
                              value={recipeName}
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              YouTube Video URL
                            </label>
                            <input
                              type="url"
                              value={videoUrl}
                              onChange={(e) => setVideoURLs(prev => ({ ...prev, [recipeName]: e.target.value }))}
                              placeholder="https://www.youtube.com/watch?v=..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditVideoURL(recipeName, videoUrl)}
                              disabled={loading}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingRecipe(null)}
                              className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {getVideoThumbnail(videoUrl) && (
                              <img
                                src={getVideoThumbnail(videoUrl)!}
                                alt={recipeName}
                                className="w-16 h-12 object-cover rounded"
                              />
                            )}
                            <div>
                              <h3 className="font-medium text-gray-900 capitalize">{recipeName}</h3>
                              <p className="text-sm text-gray-500 truncate max-w-xs">{videoUrl}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openVideoInNewTab(videoUrl)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              title="Open video"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingRecipe(recipeName)}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                              title="Edit video URL"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteVideoURL(recipeName)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                              title="Delete video URL"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add Button */}
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-6 w-full flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Recipe Video
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 