import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Loader,
  Users,
  User,
  Check,
} from "lucide-react";
import api from "../../services/api";
import useChatStore from "../../store/chatStore";
import toast from "react-hot-toast";
import { P } from "../../theme";

export default function NewChatModal({ onClose }) {
  const [tab, setTab] = useState("direct");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);

  const {
    setActiveConversation,
    setConversations,
    conversations,
  } = useChatStore();

  const handleSearch = async (e) => {
    const val = e.target.value;

    setQuery(val);

    if (!val.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.get(
        `/conversations/search?query=${val}`
      );

      setResults(data);
    } catch {
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleStartDirect = async (userId) => {
    try {
      const { data } = await api.post("/conversations", {
        userId,
      });

      const exists = conversations.find(
        (c) => c._id === data._id
      );

      if (!exists) {
        setConversations([data, ...conversations]);
      }

      setActiveConversation(data);
      onClose();
    } catch {
      toast.error("Failed to start conversation");
    }
  };

  const toggleUser = (user) => {
    setSelectedUsers((prev) => {
      const exists = prev.find(
        (u) => u._id === user._id
      );

      if (exists) {
        return prev.filter((u) => u._id !== user._id);
      }

      return [...prev, user];
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      return toast.error("Group name is required");
    }

    if (selectedUsers.length < 2) {
      return toast.error(
        "Select at least 2 members"
      );
    }

    try {
      const { data } = await api.post(
        "/conversations/group",
        {
          name: groupName,
          members: selectedUsers.map((u) => u._id),
        }
      );

      setConversations([data, ...conversations]);
      setActiveConversation(data);

      toast.success("Group created!");
      onClose();
    } catch {
      toast.error("Failed to create group");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        style={{
          background: "rgba(0,0,0,.72)",
          backdropFilter: "blur(10px)",
        }}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Floating Glow */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            x: [0, 25, -20, 0],
            y: [0, -20, 15, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 10,
          }}
          className="absolute w-72 h-72 rounded-full blur-3xl opacity-20"
          style={{
            background: P.gold,
            top: "-70px",
            left: "-70px",
          }}
        />

        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{
            opacity: 0,
            y: 35,
            scale: 0.96,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            y: 25,
          }}
          transition={{
            duration: 0.35,
            ease: "easeOut",
          }}
          className="
            relative
            w-full
            max-w-lg
            overflow-hidden
            rounded-3xl
            border
            shadow-2xl
            flex
            flex-col
            max-h-[90vh]
          "
          style={{
            background: P.card,
            borderColor: P.border,
            boxShadow: `0 0 40px ${P.goldGlow}`,
          }}
        >
          {/* Header */}

          <div
            className="flex items-center justify-between px-5 sm:px-6 py-5 border-b"
            style={{
              borderColor: P.border,
            }}
          >
            <div>
              <h2
                className="text-xl font-bold"
                style={{
                  color: P.text,
                }}
              >
                New Conversation
              </h2>

              <p
                className="text-sm mt-1"
                style={{
                  color: P.textMid,
                }}
              >
                Start chatting with teammates
              </p>
            </div>

            <motion.button
              whileHover={{
                rotate: 90,
                scale: 1.08,
              }}
              whileTap={{
                scale: 0.9,
              }}
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: P.surface,
                border: `1px solid ${P.border}`,
                color: P.textMid,
              }}
            >
              <X size={18} />
            </motion.button>
          </div>

          {/* Tabs */}

          <div className="grid grid-cols-2 gap-3 px-5 sm:px-6 pt-5">

            <motion.button
              whileTap={{ scale: .97 }}
              whileHover={{ y: -2 }}
              onClick={() => setTab("direct")}
              className="rounded-2xl py-3 flex items-center justify-center gap-2 font-semibold transition"
              style={{
                background:
                  tab === "direct"
                    ? P.gold
                    : P.surface,

                color:
                  tab === "direct"
                    ? P.bg
                    : P.textMid,

                border: `1px solid ${
                  tab === "direct"
                    ? P.gold
                    : P.border
                }`,
              }}
            >
              <User size={17} />

              Direct
            </motion.button>

            <motion.button
              whileTap={{ scale: .97 }}
              whileHover={{ y: -2 }}
              onClick={() => setTab("group")}
              className="rounded-2xl py-3 flex items-center justify-center gap-2 font-semibold transition"
              style={{
                background:
                  tab === "group"
                    ? P.gold
                    : P.surface,

                color:
                  tab === "group"
                    ? P.bg
                    : P.textMid,

                border: `1px solid ${
                  tab === "group"
                    ? P.gold
                    : P.border
                }`,
              }}
            >
              <Users size={17} />

              Group
            </motion.button>

          </div>

          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">

            {tab === "group" && (
              <motion.input
                initial={{
                  opacity: 0,
                  y: -8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                value={groupName}
                onChange={(e) =>
                  setGroupName(e.target.value)
                }
                placeholder="Enter group name..."
                className="w-full rounded-2xl px-4 py-3 outline-none text-sm transition mb-4"
                style={{
                  background: P.surface,
                  color: P.text,
                  border: `1px solid ${P.border}`,
                }}
              />
            )}

            <div className="relative">

              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2"
                style={{
                  color: P.textMid,
                }}
              />

              <input
                value={query}
                onChange={handleSearch}
                placeholder="Search people..."
                className="w-full rounded-2xl py-3 pl-12 pr-4 outline-none text-sm transition"
                style={{
                  background: P.surface,
                  color: P.text,
                  border: `1px solid ${P.border}`,
                }}
              />
            </div>

            {/* Part 2 starts here */}
                        {/* Selected Users */}

                        <AnimatePresence>
              {tab === "group" &&
                selectedUsers.length > 0 && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      height: 0,
                    }}
                    animate={{
                      opacity: 1,
                      height: "auto",
                    }}
                    exit={{
                      opacity: 0,
                      height: 0,
                    }}
                    className="flex flex-wrap gap-2 mt-4 mb-4"
                  >
                    {selectedUsers.map((user) => (
                      <motion.div
                        key={user._id}
                        layout
                        initial={{
                          scale: .8,
                          opacity: 0,
                        }}
                        animate={{
                          scale: 1,
                          opacity: 1,
                        }}
                        exit={{
                          scale: .8,
                          opacity: 0,
                        }}
                        className="flex items-center gap-2 rounded-full pl-3 pr-2 py-1.5"
                        style={{
                          background: P.goldGlow,
                          border: `1px solid ${P.goldDim}`,
                        }}
                      >
                        <span
                          className="text-xs font-medium"
                          style={{
                            color: P.gold,
                          }}
                        >
                          {user.name}
                        </span>

                        <button
                          onClick={() =>
                            toggleUser(user)
                          }
                          className="w-5 h-5 rounded-full flex items-center justify-center transition"
                          style={{
                            background: P.surface,
                            color: P.gold,
                          }}
                        >
                          <X size={12} />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
            </AnimatePresence>

            {/* Results */}

            <div className="mt-2 space-y-2 max-h-[340px] overflow-y-auto pr-1">

              {loading && (

                <div className="flex justify-center py-12">

                  <Loader
                    size={28}
                    className="animate-spin"
                    style={{
                      color: P.gold,
                    }}
                  />

                </div>

              )}

              {!loading &&
                results.map((user) => {

                  const isSelected =
                    selectedUsers.find(
                      (u) =>
                        u._id === user._id
                    );

                  return (

                    <motion.div
                      key={user._id}
                      whileHover={{
                        y: -2,
                        scale: 1.01,
                      }}
                      whileTap={{
                        scale: .99,
                      }}
                      onClick={() =>
                        tab === "direct"
                          ? handleStartDirect(
                              user._id
                            )
                          : toggleUser(user)
                      }
                      className="cursor-pointer rounded-2xl p-3 flex items-center gap-3 transition"
                      style={{
                        background: isSelected
                          ? P.goldGlow
                          : P.surface,

                        border: `1px solid ${
                          isSelected
                            ? P.goldDim
                            : P.border
                        }`,
                      }}
                    >

                      {/* Avatar */}

                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center font-bold shrink-0"
                        style={{
                          background:
                            P.goldGlow,

                          color: P.gold,

                          border: `1px solid ${P.goldDim}`,
                        }}
                      >
                        {user.name
                          ?.charAt(0)
                          .toUpperCase()}
                      </div>

                      {/* Info */}

                      <div className="flex-1 min-w-0">

                        <p
                          className="font-semibold truncate"
                          style={{
                            color: P.text,
                          }}
                        >
                          {user.name}
                        </p>

                        <p
                          className="text-xs truncate mt-0.5"
                          style={{
                            color: P.textMid,
                          }}
                        >
                          {user.email}
                        </p>

                      </div>

                      {/* Check */}

                      {tab === "group" &&
                        isSelected && (

                          <motion.div
                            initial={{
                              scale: 0,
                            }}
                            animate={{
                              scale: 1,
                            }}
                            className="w-7 h-7 rounded-full flex items-center justify-center"
                            style={{
                              background:
                                P.gold,
                            }}
                          >
                            <Check
                              size={15}
                              color={P.bg}
                              strokeWidth={
                                3
                              }
                            />
                          </motion.div>

                        )}

                    </motion.div>

                  );
                })}

              {!loading &&
                query &&
                results.length === 0 && (

                  <motion.div
                    initial={{
                      opacity: 0,
                    }}
                    animate={{
                      opacity: 1,
                    }}
                    className="text-center py-12"
                  >

                    <Users
                      size={42}
                      className="mx-auto mb-3"
                      style={{
                        color: P.textDim,
                      }}
                    />

                    <p
                      style={{
                        color: P.textMid,
                      }}
                    >
                      No users found
                    </p>

                  </motion.div>

                )}

              {!loading &&
                !query && (

                  <motion.div
                    initial={{
                      opacity: 0,
                    }}
                    animate={{
                      opacity: 1,
                    }}
                    className="text-center py-12"
                  >

                    <Search
                      size={42}
                      className="mx-auto mb-3"
                      style={{
                        color: P.textDim,
                      }}
                    />

                    <p
                      style={{
                        color: P.textMid,
                      }}
                    >
                      Search by name or email
                    </p>

                  </motion.div>

                )}

            </div>

            {/* Part 3 starts here */}
                        {/* Footer */}

                        {tab === "group" && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="mt-6"
              >
                <button
                  onClick={handleCreateGroup}
                  disabled={
                    selectedUsers.length < 2 ||
                    !groupName.trim()
                  }
                  className="w-full rounded-2xl py-3.5 font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    background: P.gold,
                    color: P.bg,
                    boxShadow: `0 0 20px ${P.goldGlow}`,
                  }}
                >
                  Create Group
                  {selectedUsers.length > 0 &&
                    ` (${selectedUsers.length} Members)`}
                </button>

                <p
                  className="text-center text-xs mt-3"
                  style={{
                    color: P.textDim,
                  }}
                >
                  Select at least 2 members
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}