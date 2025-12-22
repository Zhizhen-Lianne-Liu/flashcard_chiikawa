import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Tag,
  Input,
  Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { fetchCardsByDeck, deleteCard } from '../store/cardsSlice';
import { fetchDecks } from '../store/decksSlice';
import { AppDispatch, RootState } from '../store';
import type { Card as CardType, Tag as TagType } from '../types/card';

function DeckDetail() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { cards, loading } = useSelector((state: RootState) => state.cards);
  const { decks } = useSelector((state: RootState) => state.decks);
  const [searchText, setSearchText] = useState('');
  const [cardTags, setCardTags] = useState<Record<number, TagType[]>>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const deck = decks.find((d) => d.id === Number(deckId));

  useEffect(() => {
    if (deckId) {
      dispatch(fetchCardsByDeck(Number(deckId)));
      dispatch(fetchDecks());
    }
  }, [dispatch, deckId]);

  useEffect(() => {
    loadAllCardTags();
  }, [cards]);

  const loadAllCardTags = async () => {
    const tagsMap: Record<number, TagType[]> = {};
    for (const card of cards) {
      try {
        const tags = await window.electronAPI.tags.getForCard(card.id);
        tagsMap[card.id] = tags;
      } catch (error) {
        console.error(`Failed to load tags for card ${card.id}:`, error);
      }
    }
    setCardTags(tagsMap);
  };

  const handleDelete = async (id: number) => {
    try {
      await dispatch(deleteCard(id)).unwrap();
      message.success('Card deleted successfully!');
    } catch (error) {
      message.error('Failed to delete card');
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedRowKeys) {
        await dispatch(deleteCard(Number(id))).unwrap();
      }
      message.success(`${selectedRowKeys.length} cards deleted successfully!`);
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('Failed to delete cards');
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    },
  };

  const filteredCards = cards.filter(
    (card) =>
      card.front.toLowerCase().includes(searchText.toLowerCase()) ||
      card.back.toLowerCase().includes(searchText.toLowerCase()) ||
      (card.context && card.context.toLowerCase().includes(searchText.toLowerCase())) ||
      (card.notes && card.notes.toLowerCase().includes(searchText.toLowerCase()))
  );

  const columns = [
    {
      title: 'Front (German)',
      dataIndex: 'front',
      key: 'front',
      width: '20%',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: 'Back (Translation)',
      dataIndex: 'back',
      key: 'back',
      width: '20%',
    },
    {
      title: 'Context',
      dataIndex: 'context',
      key: 'context',
      width: '20%',
      render: (text: string) => text || <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      width: '15%',
      render: (text: string) => text || <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'Tags',
      key: 'tags',
      width: '15%',
      render: (_: any, record: CardType) => (
        <Space wrap size={[0, 4]}>
          {cardTags[record.id]?.map((tag) => (
            <Tag key={tag.id} color={tag.color || 'blue'} style={{ margin: 0 }}>
              {tag.name}
            </Tag>
          )) || <span style={{ color: '#999' }}>—</span>}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '10%',
      render: (_: any, record: CardType) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => navigate(`/editor/${record.id}`)}
          />
          <Popconfirm
            title="Delete this card?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              style={{ color: '#000' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ff6b6b'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#000'}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/decks')}>
            Back to Decks
          </Button>
          <h1 style={{ margin: 0 }}>
            {deck?.icon} {deck?.name || 'Deck Details'}
          </h1>
          <Tag color={deck?.color || 'blue'}>{filteredCards.length} cards</Tag>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate(`/editor?deckId=${deckId}`)}
        >
          Add Card
        </Button>
      </div>

      {deck?.description && (
        <Card size="small" style={{ marginBottom: '16px', background: '#f5f5f5' }}>
          <p style={{ margin: 0 }}>{deck.description}</p>
        </Card>
      )}

      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Input
            placeholder="Search cards..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ maxWidth: '400px' }}
          />
          {selectedRowKeys.length > 0 && (
            <Space>
              <span>{selectedRowKeys.length} selected</span>
              <Popconfirm
                title={`Delete ${selectedRowKeys.length} cards?`}
                description="This action cannot be undone."
                onConfirm={handleBulkDelete}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<DeleteOutlined />}>
                  Delete Selected
                </Button>
              </Popconfirm>
              <Button onClick={() => setSelectedRowKeys([])}>
                Clear Selection
              </Button>
            </Space>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={filteredCards}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} cards`,
          }}
        />
      </Card>
    </div>
  );
}

export default DeckDetail;
