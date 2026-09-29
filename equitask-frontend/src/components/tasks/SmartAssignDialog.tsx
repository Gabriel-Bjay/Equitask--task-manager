import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, Box, Typography, Button, Stack, Paper,
  Avatar, Chip, LinearProgress, CircularProgress, TextField, IconButton,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { taskService } from '../../services/taskService';
import { recommendationService } from '../../services/recommendationService';
import { RankedCandidate, TaskRecommendations } from '../../types/recommendation.types';
import { apiErrorMessage } from '../../utils/apiError';
import { roleLabel } from '../../utils/constants';

interface SmartAssignDialogProps {
  task: { id: number; title: string } | null;
  onClose: () => void;
  onAssigned: () => void;
}

const COMPONENTS = [
  { key: 'skill_match', weight: 'skill', label: 'Skill match' },
  { key: 'workload', weight: 'workload', label: 'Capacity' },
  { key: 'performance', weight: 'performance', label: 'Track record' },
  { key: 'fairness', weight: 'fairness', label: 'Fairness' },
  { key: 'urgency', weight: 'urgency', label: 'Urgency fit' },
] as const;

const INITIAL_VISIBLE = 5;

const scoreColor = (score: number) => {
  if (score >= 70) return '#4caf50';
  if (score >= 40) return '#ff9800';
  return '#f44336';
};

const initials = (name: string) =>
  name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

const SmartAssignDialog: React.FC<SmartAssignDialogProps> = ({ task, onClose, onAssigned }) => {
  const [data, setData] = useState<TaskRecommendations | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [overrideFor, setOverrideFor] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!task) return;
    let cancelled = false;
    setData(null);
    setShowAll(false);
    setOverrideFor(null);
    setReason('');
    setLoading(true);
    taskService.getRecommendations(task.id)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((error) => {
        if (!cancelled) toast.error(apiErrorMessage(error, 'Could not load recommendations'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [task]);

  const run = async (candidate: RankedCandidate, assign: () => Promise<unknown>, message: string) => {
    setSubmittingId(candidate.user.id);
    try {
      await assign();
      toast.success(message);
      onAssigned();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to assign task'));
    } finally {
      setSubmittingId(null);
    }
  };

  // Accepting records the engine's explanation as the assignment's rationale.
  const accept = (candidate: RankedCandidate) => {
    if (!task) return;
    run(
      candidate,
      () => candidate.recommendation_id
        ? recommendationService.acceptRecommendation(candidate.recommendation_id, candidate.explanation)
        : taskService.assignTask(task.id, candidate.user.id, candidate.explanation),
      `Assigned to ${candidate.user.name}`,
    );
  };

  const override = (candidate: RankedCandidate) => {
    if (!task || !reason.trim()) return;
    run(
      candidate,
      () => recommendationService.overrideRecommendation(task.id, candidate.user.id, reason.trim()),
      `Assigned to ${candidate.user.name} (override recorded)`,
    );
  };

  const candidates = data?.recommendations ?? [];
  const visible = showAll ? candidates : candidates.slice(0, INITIAL_VISIBLE);

  return (
    <Dialog
      open={Boolean(task)}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      {/* Header */}
      <Box sx={{
        bgcolor: '#1A3C5E', px: 3, py: 2.5,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
            bgcolor: 'var(--accent)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <AIIcon sx={{ color: 'white', fontSize: 18 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 16 }}>
              Smart Assign
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }} noWrap>
              {task?.title}
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          aria-label="Close"
          size="small"
          sx={{ color: 'rgba(255,255,255,0.6)' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 3, bgcolor: '#F8FAFC' }}>
        {loading ? (
          <Box sx={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', py: 6, gap: 2,
          }}>
            <CircularProgress sx={{ color: 'var(--accent)' }} size={40} />
            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
              Analysing team workload and skills...
            </Typography>
          </Box>
        ) : candidates.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <PersonIcon sx={{ fontSize: 48, color: '#E2E8F0', mb: 1 }} />
            <Typography sx={{ color: '#94A3B8' }}>
              No active team members to recommend
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {/* Weights */}
            {data && (
              <Box>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                  How candidates are scored
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap', mt: 0.7 }}>
                  {COMPONENTS.map((c) => (
                    <Chip
                      key={c.key}
                      size="small"
                      label={`${c.label} ${Math.round(data.weights[c.weight] * 100)}%`}
                      sx={{ bgcolor: 'var(--accent-soft)', color: '#1A3C5E', fontSize: 11, height: 22 }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {visible.map((candidate) => {
              const isBest = candidate.rank === 1;
              const busy = submittingId === candidate.user.id;
              const firstName = candidate.user.name.split(' ')[0];
              return (
                <Paper
                  key={candidate.user.id}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: isBest ? '2px solid var(--accent)' : '1px solid #EEF2F6',
                    borderRadius: 2.5,
                    bgcolor: isBest ? 'var(--accent-softer)' : 'white',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {isBest && (
                    <Box sx={{
                      position: 'absolute', top: 12, right: -8,
                      bgcolor: 'var(--accent)', color: 'white',
                      fontSize: 10, fontWeight: 700,
                      px: 1.5, py: 0.3,
                      borderRadius: '4px 0 0 4px',
                      display: 'flex', alignItems: 'center', gap: 0.5,
                    }}>
                      <CheckIcon sx={{ fontSize: 11 }} />
                      BEST MATCH
                    </Box>
                  )}

                  {/* Candidate */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, pr: isBest ? 9 : 0 }}>
                    <Avatar sx={{
                      width: 42, height: 42,
                      bgcolor: isBest ? 'var(--accent)' : '#E2E8F0',
                      color: isBest ? 'white' : '#64748B',
                      fontWeight: 700, fontSize: 14,
                    }}>
                      {initials(candidate.user.name)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1A3C5E' }} noWrap>
                        #{candidate.rank} {candidate.user.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                        {roleLabel(candidate.user.role)} • {candidate.active_hours}h open work
                        {' '}• {candidate.confidence}% confidence
                      </Typography>
                    </Box>
                    <Box sx={{
                      textAlign: 'center',
                      bgcolor: isBest ? 'var(--accent)' : '#F1F5F9',
                      borderRadius: 2, px: 1.5, py: 0.8, minWidth: 52,
                    }}>
                      <Typography sx={{
                        fontSize: 20, fontWeight: 800, lineHeight: 1,
                        color: isBest ? 'white' : scoreColor(candidate.scores.final),
                      }}>
                        {candidate.scores.final}
                      </Typography>
                      <Typography sx={{ fontSize: 9, color: isBest ? 'rgba(255,255,255,0.7)' : '#94A3B8' }}>
                        SCORE
                      </Typography>
                    </Box>
                  </Box>

                  {/* Component scores */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, mb: 2 }}>
                    {COMPONENTS.map((c) => {
                      const value = candidate.scores[c.key];
                      return (
                        <Box key={c.key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Typography sx={{
                            fontSize: 11, color: '#64748B',
                            width: 84, flexShrink: 0, fontWeight: 500,
                          }}>
                            {c.label}
                          </Typography>
                          <Box sx={{ flex: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={value}
                              aria-label={`${c.label} ${value}%`}
                              sx={{
                                height: 6, borderRadius: 3, bgcolor: '#EEF2F6',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: scoreColor(value), borderRadius: 3,
                                },
                              }}
                            />
                          </Box>
                          <Typography sx={{
                            fontSize: 11, fontWeight: 700,
                            color: scoreColor(value), width: 36, textAlign: 'right',
                          }}>
                            {value}%
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>

                  {/* Skills */}
                  {(candidate.matching_skills.length > 0 || candidate.missing_skills.length > 0) && (
                    <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap', mb: 1.5 }}>
                      {candidate.matching_skills.map((skill) => (
                        <Chip
                          key={skill} label={`✓ ${skill}`} size="small"
                          sx={{ bgcolor: '#E8F5E9', color: '#2e7d32', fontSize: 10, height: 20, fontWeight: 600 }}
                        />
                      ))}
                      {candidate.missing_skills.map((skill) => (
                        <Chip
                          key={skill} label={`✗ ${skill}`} size="small"
                          sx={{ bgcolor: '#FEECEC', color: '#c62828', fontSize: 10, height: 20, fontWeight: 500 }}
                        />
                      ))}
                    </Box>
                  )}

                  {/* Why */}
                  <Typography sx={{ fontSize: 12, color: '#475569', lineHeight: 1.5, mb: 2 }}>
                    <Box component="span" sx={{ fontWeight: 700, color: '#1A3C5E' }}>Why: </Box>
                    {candidate.explanation}
                  </Typography>

                  {/* Actions */}
                  {isBest ? (
                    <Button
                      fullWidth
                      variant="contained"
                      disabled={submittingId !== null}
                      onClick={() => accept(candidate)}
                      sx={{
                        py: 1, bgcolor: 'var(--accent)', fontWeight: 600,
                        '&:hover': { bgcolor: 'var(--accent-dark)' },
                      }}
                    >
                      {busy ? 'Assigning...' : `Assign to ${firstName}`}
                    </Button>
                  ) : overrideFor === candidate.user.id ? (
                    <Stack spacing={1}>
                      <TextField
                        autoFocus
                        fullWidth
                        multiline
                        minRows={2}
                        size="small"
                        label={`Why ${firstName} instead of the top recommendation?`}
                        helperText="Required. Saved with the assignment for accountability."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button onClick={() => setOverrideFor(null)} sx={{ color: '#64748B' }}>
                          Cancel
                        </Button>
                        <Button
                          variant="contained"
                          disabled={!reason.trim() || submittingId !== null}
                          onClick={() => override(candidate)}
                          sx={{ bgcolor: '#1A3C5E', '&:hover': { bgcolor: '#0F2A44' } }}
                        >
                          {busy ? 'Assigning...' : 'Confirm override'}
                        </Button>
                      </Box>
                    </Stack>
                  ) : (
                    <Button
                      fullWidth
                      variant="outlined"
                      disabled={submittingId !== null}
                      onClick={() => { setOverrideFor(candidate.user.id); setReason(''); }}
                      sx={{
                        py: 1, borderColor: 'var(--accent)', color: 'var(--accent)', fontWeight: 600,
                        '&:hover': { bgcolor: 'var(--accent-softer)', borderColor: 'var(--accent)' },
                      }}
                    >
                      Assign {firstName} instead…
                    </Button>
                  )}
                </Paper>
              );
            })}

            {candidates.length > INITIAL_VISIBLE && (
              <Button onClick={() => setShowAll(!showAll)} sx={{ color: 'var(--accent)' }}>
                {showAll ? 'Show top matches only' : `Show all ${candidates.length} candidates`}
              </Button>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SmartAssignDialog;
