import { type EdgeProps, getBezierPath } from '@xyflow/react';

export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.4,
  });

  return (
    <>
      {/* Invisible wider path for easier selection */}
      <path
        id={`${id}-hitarea`}
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction"
      />
      {/* Subtle glow */}
      <path
        d={edgePath}
        fill="none"
        stroke="hsl(233 63% 53% / 0.15)"
        strokeWidth={6}
        filter="blur(4px)"
      />
      {/* Main edge */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke="hsl(233 63% 50%)"
        strokeWidth={2}
        className="react-flow__edge-path transition-all duration-300"
        style={style}
        markerEnd={markerEnd}
      />
      {/* Animated pulse dot */}
      <circle r="3" fill="hsl(233 63% 65%)" opacity="0.8">
        <animateMotion dur="3s" repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  );
}
