import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  List,
  Button,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Space,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { fetchDecks, createDeck, deleteDeck } from '../store/decksSlice';
import { AppDispatch, RootState } from '../store';
import { NewDeck } from '../types/deck';

function DeckList() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { decks, loading } = useSelector((state: RootState) => state.decks);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    dispatch(fetchDecks());
  }, [dispatch]);

  const handleCreateDeck = async (values: NewDeck) => {
    try {
      await dispatch(createDeck(values)).unwrap();
      message.success('Deck created successfully!');
      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      message.error('Failed to create deck');
    }
  };

  const handleDeleteDeck = async (id: number) => {
    try {
      await dispatch(deleteDeck(id)).unwrap();
      message.success('Deck deleted successfully!');
    } catch (error) {
      message.error('Failed to delete deck');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1>My Decks</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
        >
          Create Deck
        </Button>
      </div>

      <List
        grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3, xl: 4 }}
        dataSource={decks}
        loading={loading}
        renderItem={(deck) => (
          <List.Item>
            <Card
              title={
                <div style={{ fontSize: '18px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  {deck.icon && <span style={{ marginRight: '8px', fontSize: '24px' }}>{deck.icon}</span>}
                  <span>{deck.name}</span>
                </div>
              }
              extra={
                <Popconfirm
                  title="Delete this deck?"
                  description="This will delete all cards in this deck. This action cannot be undone."
                  onConfirm={(e) => {
                    e?.stopPropagation();
                    handleDeleteDeck(deck.id);
                  }}
                  okText="Delete"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              }
              style={{
                borderLeft: `4px solid ${deck.color || '#1890ff'}`,
                cursor: 'pointer'
              }}
              hoverable
              onClick={() => navigate(`/decks/${deck.id}`)}
            >
              <p>{deck.description || 'No description'}</p>
              <div style={{ marginTop: '16px' }}>
                <Space size="large">
                  <span>
                    <strong>{deck.cardCount || 0}</strong> cards
                  </span>
                  {(deck.dueCount || 0) > 0 && (
                    <span style={{ color: '#1890ff' }}>
                      <strong>{deck.dueCount}</strong> due
                    </span>
                  )}
                  {(deck.newCount || 0) > 0 && (
                    <span style={{ color: '#52c41a' }}>
                      <strong>{deck.newCount}</strong> new
                    </span>
                  )}
                </Space>
              </div>
              <p style={{ marginTop: '8px', color: '#888', fontSize: '12px' }}>
                Created: {new Date(deck.created_at).toLocaleDateString()}
              </p>
            </Card>
          </List.Item>
        )}
      />

      <Modal
        title="Create New Deck"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateDeck}>
          <Form.Item
            label="Deck Name"
            name="name"
            rules={[{ required: true, message: 'Please enter a deck name' }]}
          >
            <Input placeholder="e.g., German Verbs" />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} placeholder="Brief description of this deck" />
          </Form.Item>
          <Form.Item label="Icon (Emoji)" name="icon">
            <Input placeholder="📚" maxLength={2} />
          </Form.Item>
          <Form.Item label="Color" name="color">
            <Input type="color" defaultValue="#1890ff" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default DeckList;
