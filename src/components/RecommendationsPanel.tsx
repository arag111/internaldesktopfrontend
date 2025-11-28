'use client';

interface Recommendation {
  text: string;
  priority?: 'high' | 'medium' | 'low';
}

interface RecommendationsPanelProps {
  recommendations: string[];
  maxItems?: number;
}

export default function RecommendationsPanel({
  recommendations,
  maxItems = 5
}: RecommendationsPanelProps) {
  // Get unique recommendations and limit to maxItems
  const uniqueRecommendations = Array.from(new Set(recommendations)).slice(0, maxItems);

  const getPriorityIcon = (index: number) => {
    if (index === 0) return '🎯'; // High priority
    if (index === 1) return '⚡'; // Medium priority
    return '💡'; // Low priority
  };

  const getPriorityBadge = (index: number) => {
    if (index === 0) return { text: 'High Priority', color: 'bg-red-100 text-red-700 border-red-300' };
    if (index === 1) return { text: 'Medium Priority', color: 'bg-amber-100 text-amber-700 border-amber-300' };
    return { text: 'Low Priority', color: 'bg-blue-100 text-blue-700 border-blue-300' };
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 border border-indigo-200">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">💡</span>
        <h3 className="text-lg font-bold text-gray-800">
          Key Recommendations
        </h3>
      </div>

      {uniqueRecommendations.length > 0 ? (
        <div className="space-y-3">
          {uniqueRecommendations.map((recommendation, index) => {
            const priorityBadge = getPriorityBadge(index);

            return (
              <div
                key={index}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  {/* Priority Number */}
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    {/* Priority Badge */}
                    {index < 3 && (
                      <div className="mb-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${priorityBadge.color}`}>
                          {priorityBadge.text}
                        </span>
                      </div>
                    )}

                    {/* Recommendation Text */}
                    <p className="text-sm text-gray-700 leading-relaxed">
                      <span className="mr-2">{getPriorityIcon(index)}</span>
                      {recommendation}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500 text-sm">
          <p>No recommendations available</p>
          <p className="text-xs mt-1">Keep up the good work!</p>
        </div>
      )}

      {/* Footer Note */}
      {uniqueRecommendations.length > 0 && (
        <div className="mt-4 p-3 bg-white/50 rounded-lg border border-indigo-100">
          <p className="text-xs text-gray-600 italic">
            💼 These recommendations are generated based on your activity patterns and job role requirements.
          </p>
        </div>
      )}
    </div>
  );
}
