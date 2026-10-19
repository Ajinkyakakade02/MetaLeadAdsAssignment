import { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
} from "react-native";
import { io, Socket } from "socket.io-client";

// Android emulator -> your PC. For a physical phone use your ngrok URL or PC LAN IP.
const SERVER_URL = "http://10.0.2.2:3000";

type LeadField = {
  name: string;
  values: string[];
};

type Lead = {
  id: string;
  created_time?: string;
  field_data?: LeadField[];
};

export default function HomeScreen() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [connection, setConnection] = useState("Connecting...");

  useEffect(() => {
    const socket: Socket = io(SERVER_URL, {
      transports: ["websocket"],
    });

    // Load leads the server already has (runs on first connect and every reconnect)
    async function loadLeads() {
      try {
        const res = await fetch(`${SERVER_URL}/leads`);
        const data: Lead[] = await res.json();

        setLeads((previous) => {
          const ids = new Set(previous.map((item) => item.id));
          return [...previous, ...data.filter((item) => !ids.has(item.id))];
        });
      } catch {
        // the socket will still deliver new leads
      }
    }

    socket.on("connect", () => {
      setConnection("Connected");
      loadLeads();
    });

    socket.on("disconnect", () => {
      setConnection("Disconnected");
    });

    socket.on("connect_error", () => {
      setConnection("Connection failed");
    });

    socket.on("new_lead", (lead: Lead) => {
      setLeads((previous) => {
        if (previous.some((item) => item.id === lead.id)) {
          return previous;
        }

        return [lead, ...previous];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  function getField(lead: Lead, fieldName: string) {
    const field = lead.field_data?.find(
      (item) => item.name.toLowerCase() === fieldName.toLowerCase()
    );

    return field?.values?.[0] || "Not provided";
  }

  function renderLead({ item }: { item: Lead }) {
    const name = getField(item, "full_name");
    const isMetaTestLead = name.startsWith("<test lead");

    return (
      <View style={styles.leadCard}>
        <View style={styles.leadHeader}>
          <Text style={styles.leadTitle}>
            {name !== "Not provided" ? name : "New Lead"}
          </Text>
          <Text style={styles.badge}>NEW</Text>
        </View>

        {isMetaTestLead && (
          <Text style={styles.testTag}>TEST LEAD FROM META TESTING TOOL</Text>
        )}

        <Text style={styles.label}>EMAIL</Text>
        <Text style={styles.value}>{getField(item, "email")}</Text>

        <Text style={styles.label}>LEAD ID</Text>
        <Text style={styles.value}>{item.id}</Text>

        <Text style={styles.date}>
          {item.created_time
            ? new Date(item.created_time).toLocaleString()
            : "Just received"}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#101827" />

      <View style={styles.header}>
        <Text style={styles.brand}>LEADSTREAM</Text>
        <Text style={styles.heading}>Meta Leads</Text>
        <Text style={styles.subtitle}>Real-time lead monitoring dashboard</Text>

        <View style={styles.connectionRow}>
          <View
            style={[
              styles.connectionDot,
              connection === "Connected"
                ? styles.connectedDot
                : styles.disconnectedDot,
            ]}
          />
          <Text style={styles.connectionText}>{connection}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.statsCard}>
          <View>
            <Text style={styles.statsLabel}>TOTAL LEADS RECEIVED</Text>
            <Text style={styles.statsNumber}>{leads.length}</Text>
          </View>
          <Text style={styles.statsIcon}>↗</Text>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Incoming Leads</Text>
          <Text style={styles.liveLabel}>● LIVE</Text>
        </View>

        <FlatList
          data={leads}
          keyExtractor={(item) => item.id}
          renderItem={renderLead}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>↗</Text>
              <Text style={styles.emptyTitle}>Waiting for leads</Text>
              <Text style={styles.emptyText}>
                Submit a test lead through Meta Lead Ads Testing Tool. New
                leads will appear here automatically.
              </Text>
            </View>
          }
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          LEADSTREAM  •  META WEBHOOK INTEGRATION
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101827",
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 25,
    backgroundColor: "#101827",
  },
  brand: {
    color: "#60A5FA",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 3,
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    marginTop: 14,
  },
  subtitle: {
    color: "#9CAEC5",
    fontSize: 14,
    marginTop: 7,
  },
  connectionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    gap: 8,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectedDot: {
    backgroundColor: "#34D399",
  },
  disconnectedDot: {
    backgroundColor: "#F87171",
  },
  connectionText: {
    color: "#D1D9E6",
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    backgroundColor: "#F3F6FB",
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 2,
  },
  statsLabel: {
    color: "#718096",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  statsNumber: {
    color: "#111827",
    fontSize: 36,
    fontWeight: "800",
    marginTop: 8,
  },
  statsIcon: {
    color: "#2563EB",
    fontSize: 30,
    fontWeight: "700",
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 26,
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 19,
    fontWeight: "800",
  },
  liveLabel: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "800",
  },
  list: {
    paddingBottom: 18,
    flexGrow: 1,
  },
  leadCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5EAF2",
  },
  leadHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  leadTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "800",
    flex: 1,
  },
  badge: {
    color: "#047857",
    backgroundColor: "#D1FAE5",
    overflow: "hidden",
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: "800",
  },
  testTag: {
    color: "#B45309",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: -8,
    marginBottom: 4,
  },
  label: {
    color: "#718096",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 9,
  },
  value: {
    color: "#263449",
    fontSize: 13,
    marginTop: 4,
  },
  date: {
    color: "#8794A7",
    fontSize: 11,
    marginTop: 15,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 36,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5EAF2",
    marginTop: 4,
  },
  emptyIcon: {
    color: "#2563EB",
    fontSize: 38,
    fontWeight: "700",
  },
  emptyTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 14,
  },
  emptyText: {
    color: "#718096",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },
  footer: {
    backgroundColor: "#101827",
    padding: 14,
    alignItems: "center",
  },
  footerText: {
    color: "#8291A8",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
});