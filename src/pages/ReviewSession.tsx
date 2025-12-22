import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Button, Space, Progress, Empty, Statistic, message } from 'antd';
import { SmileOutlined, MehOutlined } from '@ant-design/icons';
import {
  fetchDueCards,
  toggleAnswer,
  startSession,
  submitReview,
  nextCard,
  endSession,
} from '../store/reviewSlice';
import { AppDispatch, RootState } from '../store';
import { GradeButton } from '../algorithms/sm2';

function ReviewSession() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    dueCards,
    currentCardIndex,
    showAnswer,
    isSessionActive,
    loading,
    cardStartTime,
    sessionStartTime,
    results,
  } = useSelector((state: RootState) => state.review);

  const [isSessionComplete, setIsSessionComplete] = useState(false);

  useEffect(() => {
    dispatch(fetchDueCards());
  }, [dispatch]);

  const handleStartSession = () => {
    setIsSessionComplete(false);
    dispatch(startSession());
  };

  const handleToggleAnswer = () => {
    dispatch(toggleAnswer());
  };

  const handleGrade = async (quality: number) => {
    if (!cardStartTime) {
      message.error('Card timer not started');
      return;
    }

    const currentCard = dueCards[currentCardIndex];
    const timeSpent = Date.now() - cardStartTime;

    try {
      await dispatch(
        submitReview({
          cardId: currentCard.id,
          quality,
          timeSpent,
        })
      ).unwrap();

      // Move to next card or end session
      if (currentCardIndex < dueCards.length - 1) {
        dispatch(nextCard());
      } else {
        // Session complete
        setIsSessionComplete(true);
        dispatch(endSession());
      }
    } catch (error) {
      message.error('Failed to submit review');
      console.error('Review submission error:', error);
    }
  };

  if (loading) {
    return <div>Loading due cards...</div>;
  }

  // Session complete view
  if (isSessionComplete) {
    const totalCards = results.length;
    const correctCards = results.filter((r) => r.was_correct).length;
    const totalTime = sessionStartTime ? Date.now() - sessionStartTime : 0;
    const avgTime = totalCards > 0 ? totalTime / totalCards : 0;

    return (
      <div>
        <h1>Session Complete!</h1>
        <Card style={{ marginTop: '24px', textAlign: 'center' }}>
          <SmileOutlined style={{ fontSize: '64px', color: '#52c41a', marginBottom: '24px' }} />
          <h2>Great work!</h2>
          <Space size="large" style={{ marginTop: '32px' }}>
            <Statistic title="Cards Reviewed" value={totalCards} />
            <Statistic
              title="Correct"
              value={correctCards}
              suffix={`/ ${totalCards}`}
              valueStyle={{ color: '#52c41a' }}
            />
            <Statistic
              title="Accuracy"
              value={totalCards > 0 ? Math.round((correctCards / totalCards) * 100) : 0}
              suffix="%"
            />
            <Statistic
              title="Avg Time"
              value={Math.round(avgTime / 1000)}
              suffix="s"
            />
          </Space>
          <div style={{ marginTop: '32px' }}>
            <Button
              type="primary"
              size="large"
              onClick={() => {
                setIsSessionComplete(false);
                dispatch(fetchDueCards());
              }}
            >
              Back to Review
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!isSessionActive) {
    if (dueCards.length === 0) {
      return (
        <div>
          <h1>Review Session</h1>
          <Card style={{ marginTop: '24px' }}>
            <Empty
              description="No cards due for review today!"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <p>Come back later or add new cards to study.</p>
            </Empty>
          </Card>
        </div>
      );
    }

    return (
      <div>
        <h1>Review Session</h1>
        <Card style={{ marginTop: '24px', textAlign: 'center' }}>
          <h2>{dueCards.length} cards due for review</h2>
          <Button
            type="primary"
            size="large"
            onClick={handleStartSession}
            style={{ marginTop: '24px' }}
          >
            Start Review Session
          </Button>
        </Card>
      </div>
    );
  }

  const currentCard = dueCards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / dueCards.length) * 100;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Progress percent={Math.round(progress)} />
        <p style={{ textAlign: 'center', marginTop: '8px' }}>
          Card {currentCardIndex + 1} of {dueCards.length}
        </p>
      </div>

      <Card
        style={{
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            fontSize: '32px',
            textAlign: 'center',
            marginBottom: '24px',
          }}
        >
          {currentCard.front}
        </div>

        {showAnswer && (
          <div
            style={{
              fontSize: '24px',
              textAlign: 'center',
              color: '#666',
              borderTop: '2px solid #eee',
              paddingTop: '24px',
              marginTop: '24px',
              width: '100%',
            }}
          >
            <p>{currentCard.back}</p>
            {currentCard.context && (
              <p style={{ fontSize: '16px', fontStyle: 'italic', marginTop: '16px' }}>
                {currentCard.context}
              </p>
            )}
            {currentCard.notes && (
              <p style={{ fontSize: '14px', color: '#999', marginTop: '8px' }}>
                {currentCard.notes}
              </p>
            )}
          </div>
        )}

        <Button
          type="primary"
          size="large"
          onClick={handleToggleAnswer}
          style={{ marginTop: '32px' }}
        >
          {showAnswer ? 'Hide Answer' : 'Show Answer'}
        </Button>

        {showAnswer && (
          <Space style={{ marginTop: '32px' }} size="large">
            <Button danger onClick={() => handleGrade(GradeButton.Again)}>
              Again
              <div style={{ fontSize: '11px', opacity: 0.7 }}>1 day</div>
            </Button>
            <Button onClick={() => handleGrade(GradeButton.Hard)}>
              Hard
              <div style={{ fontSize: '11px', opacity: 0.7 }}>Shorter</div>
            </Button>
            <Button type="primary" onClick={() => handleGrade(GradeButton.Good)}>
              Good
              <div style={{ fontSize: '11px', opacity: 0.7 }}>Normal</div>
            </Button>
            <Button
              type="primary"
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
              onClick={() => handleGrade(GradeButton.Easy)}
            >
              Easy
              <div style={{ fontSize: '11px', opacity: 0.7 }}>Longer</div>
            </Button>
          </Space>
        )}
      </Card>
    </div>
  );
}

export default ReviewSession;
