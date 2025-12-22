import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Button, Space, Progress, Empty, Statistic, message } from 'antd';
import { SmileOutlined, SwapOutlined } from '@ant-design/icons';
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

      <div className="review-card-container">
        <Button
          className="flip-icon-btn"
          onClick={handleToggleAnswer}
          icon={<SwapOutlined style={{ fontSize: '20px' }} />}
        />

        <Card
          style={{
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px',
          }}
        >
          <div
            style={{
              fontSize: '36px',
              textAlign: 'center',
              marginBottom: '24px',
              fontWeight: 700,
              color: '#2b2b2b',
            }}
          >
            {currentCard.front}
          </div>

          {showAnswer && (
            <div
              style={{
                fontSize: '24px',
                textAlign: 'center',
                color: '#6b7280',
                borderTop: '4px solid #2b2b2b',
                paddingTop: '32px',
                marginTop: '32px',
                width: '100%',
              }}
            >
              <p style={{ fontWeight: 600, color: '#2b2b2b' }}>{currentCard.back}</p>
              {currentCard.context && (
                <p
                  style={{
                    fontSize: '16px',
                    fontStyle: 'italic',
                    marginTop: '20px',
                    color: '#6b7280',
                  }}
                >
                  "{currentCard.context}"
                </p>
              )}
              {currentCard.notes && (
                <p
                  style={{
                    fontSize: '14px',
                    color: '#9ca3af',
                    marginTop: '12px',
                    background: '#fef6e4',
                    padding: '8px 16px',
                    border: '2px solid #e5e7eb',
                    display: 'inline-block',
                  }}
                >
                  💡 {currentCard.notes}
                </p>
              )}
            </div>
          )}

          {showAnswer && (
            <div style={{ marginTop: '48px', display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                danger
                size="large"
                onClick={() => handleGrade(GradeButton.Again)}
                style={{
                  minHeight: '80px',
                  minWidth: '140px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '16px', fontWeight: 700 }}>AGAIN</span>
                <span style={{ fontSize: '12px', opacity: 0.9 }}>{'< 1 day'}</span>
              </Button>

              <Button
                size="large"
                onClick={() => handleGrade(GradeButton.Hard)}
                style={{
                  minHeight: '80px',
                  minWidth: '140px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#fcd5ce',
                  borderColor: '#000',
                  color: '#2b2b2b',
                }}
              >
                <span style={{ fontSize: '16px', fontWeight: 700 }}>HARD</span>
                <span style={{ fontSize: '12px', opacity: 0.8 }}>Shorter</span>
              </Button>

              <Button
                type="primary"
                size="large"
                onClick={() => handleGrade(GradeButton.Good)}
                style={{
                  minHeight: '80px',
                  minWidth: '140px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#f5cac3',
                  borderColor: '#000',
                  color: '#2b2b2b',
                }}
              >
                <span style={{ fontSize: '16px', fontWeight: 700 }}>GOOD</span>
                <span style={{ fontSize: '12px', opacity: 0.9 }}>Normal</span>
              </Button>

              <Button
                size="large"
                onClick={() => handleGrade(GradeButton.Easy)}
                style={{
                  minHeight: '80px',
                  minWidth: '140px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#90e0a8',
                  borderColor: '#000',
                  color: '#2b2b2b',
                }}
              >
                <span style={{ fontSize: '16px', fontWeight: 700 }}>EASY</span>
                <span style={{ fontSize: '12px', opacity: 0.9 }}>Longer</span>
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default ReviewSession;
