<template>
  <div class="admin-page">
    <!-- NAV -->
    <nav class="navbar">
      <RouterLink to="/" class="nav-logo">PAM TRAVEL</RouterLink>
      <div class="nav-links">
        <button v-for="tab in tabs" :key="tab.key"
          :class="['tab-btn', { active: activeTab === tab.key }]"
          @click="switchTab(tab.key)">{{ tab.label }}</button>
      </div>
      <div class="nav-user-wrap">
        <button class="icon-btn" type="button" :aria-label="ui.t.header.theme" @click="ui.toggleDark()">
          {{ ui.isDark ? '☀' : '◐' }}
        </button>
        <button class="text-btn" type="button" @click="ui.toggleLocale()">
          {{ ui.locale === 'vi' ? 'EN' : 'VI' }}
        </button>
        <div class="nav-user">
          <span class="role-badge">ADMIN</span>
          <span class="username">{{ auth.user?.fullName }}</span>
          <button class="btn-logout" @click="logout">{{ ui.t.nav.logout }}</button>
        </div>
      </div>
    </nav>

    <!-- STATS ROW -->
    <div class="stats-row">
      <div class="stat-card" v-for="s in summaryCards" :key="s.label">
        <div class="stat-num">{{ s.value }}</div>
        <div class="stat-label">{{ s.label }}</div>
      </div>
    </div>

    <!-- TABS CONTENT -->
    <div class="content">

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- TAB: NHÀ XE                                           -->
      <!-- ══════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'operators'">
        <div class="section-header">
          <span class="section-title">{{ ui.t.admin.operatorsTitle }}</span>
          <button class="btn-add-trip" @click="openAddOperator" id="btn-add-operator">
            {{ ui.t.admin.addOperator }}
          </button>
        </div>

        <!-- Grid cards -->
        <div v-if="loadingOperators" class="loading">{{ ui.t.admin.loading }}</div>
        <div v-else-if="!operators.length" class="loading">{{ ui.t.admin.noData }}</div>
        <div v-else class="op-grid">
          <div v-for="op in operators" :key="op.id"
            :class="['op-card', { 'op-card-selected': selectedOperator?.id === op.id, 'op-inactive': !op.isActive }]"
            @click="selectOperator(op)" :id="`op-card-${op.id}`">
            <div class="op-card-header">
              <span class="op-name">{{ op.name }}</span>
              <span :class="['badge', op.isActive ? 'badge-open' : 'badge-cancelled']">
                {{ op.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <div class="op-meta">
              <span class="op-meta-item">📞 {{ op.hotline || '—' }}</span>
              <span class="op-meta-item">⭐ {{ op.rating ?? '—' }}</span>
            </div>
            <div class="op-stats-row">
              <span class="op-stat">🚌 {{ op.tripCount }} chuyến</span>
              <span class="op-stat">🚐 {{ op.vehicleCount }} xe</span>
            </div>
          </div>
        </div>

        <!-- Detail panel -->
        <div v-if="selectedOperator" class="op-detail" id="op-detail-panel">
          <!-- Header -->
          <div class="op-detail-header">
            <div class="op-detail-title-row">
              <button class="btn-back-op" @click="selectedOperator = null" title="Đóng">✕</button>
              <span class="op-detail-name">{{ selectedOperator.name }}</span>
              <span :class="['badge', selectedOperator.isActive ? 'badge-open' : 'badge-cancelled']" style="margin-left:0.5rem">
                {{ selectedOperator.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <div class="op-detail-actions">
              <button class="act-btn act-edit" :title="ui.t.admin.editOperator"
                @click="openEditOperator(selectedOperator)">✏️</button>
              <button :class="['act-btn', selectedOperator.isActive ? 'act-close' : 'act-open']"
                :title="selectedOperator.isActive ? ui.t.admin.deactivate : ui.t.admin.activate"
                @click="toggleOperatorStatus(selectedOperator)">
                {{ selectedOperator.isActive ? '🔒' : '🔓' }}
              </button>
            </div>
          </div>

          <!-- Mini-tab bar -->
          <div class="op-mini-tab-bar">
            <button v-for="mt in operatorMiniTabs" :key="mt.key"
              :class="['op-mini-tab', { active: operatorDetailTab === mt.key }]"
              @click="operatorDetailTab = mt.key">
              {{ mt.label }}
              <span v-if="mt.count !== undefined" class="mini-tab-count">({{ mt.count }})</span>
            </button>
          </div>

          <!-- Mini-tab: Thông tin -->
          <div v-if="operatorDetailTab === 'info'" class="op-detail-body">
            <div class="op-info-grid">
              <div class="op-info-item">
                <span class="op-info-label">Tên nhà xe</span>
                <span class="op-info-val">{{ selectedOperator.name }}</span>
              </div>
              <div class="op-info-item">
                <span class="op-info-label">Hotline</span>
                <span class="op-info-val">{{ selectedOperator.hotline || '—' }}</span>
              </div>
              <div class="op-info-item">
                <span class="op-info-label">Đánh giá</span>
                <span class="op-info-val">⭐ {{ selectedOperator.rating ?? '—' }}</span>
              </div>
              <div class="op-info-item">
                <span class="op-info-label">Số chuyến</span>
                <span class="op-info-val">{{ selectedOperator.tripCount }}</span>
              </div>
              <div class="op-info-item">
                <span class="op-info-label">Số xe</span>
                <span class="op-info-val">{{ selectedOperator.vehicleCount }}</span>
              </div>
              <div class="op-info-item full-span">
                <span class="op-info-label">Mô tả</span>
                <span class="op-info-val">{{ selectedOperator.description || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Mini-tab: Xe -->
          <div v-else-if="operatorDetailTab === 'vehicles'" class="op-detail-body">
            <div class="op-trips-toolbar" style="margin-bottom:0.75rem">
              <span class="result-count"><strong>{{ opDetailVehicles.length }}</strong> xe</span>
              <button class="btn-add-trip" style="font-size:0.78rem;padding:0.38rem 0.9rem"
                @click="openAddVehicle(selectedOperator)">
                + Thêm xe
              </button>
            </div>
            <div v-if="loadingOpDetail" class="loading">{{ ui.t.admin.loading }}</div>
            <div v-else-if="!opDetailVehicles.length" class="op-empty-vehicle">
              <span>🚐 Chưa có xe nào</span>
              <button class="btn-add-trip" style="font-size:0.78rem;padding:0.38rem 0.9rem"
                @click="openAddVehicle(selectedOperator)">+ Thêm xe ngay</button>
            </div>
            <div v-else class="table-wrap">
              <table>
                <thead><tr>
                  <th>ID</th><th>Tên / Biển số</th><th>Loại xe</th><th>Tổng ghế</th><th style="width:52px">　</th>
                </tr></thead>
                <tbody>
                  <tr v-for="v in opDetailVehicles" :key="v.id">
                    <td class="mono">#{{ v.id }}</td>
                    <td>
                      <strong>{{ v.name }}</strong><br>
                      <span class="mono" style="font-size:0.75rem;color:var(--muted)">{{ v.licensePlate }}</span>
                    </td>
                    <td>{{ v.vehicleType }}</td>
                    <td class="mono">{{ v.totalSeats }} ghế</td>
                    <td>
                      <button class="act-btn act-delete" title="Xóa xe"
                        @click="deleteVehicle(v, selectedOperator)">🗑️</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Mini-tab: Chuyến đi -->
          <div v-else-if="operatorDetailTab === 'trips'" class="op-detail-body">
            <div class="op-trips-toolbar">
              <span class="result-count">
                <strong>{{ opDetailTrips.length }}</strong> chuyến gần nhất
              </span>
              <button class="btn-add-trip" style="font-size:0.78rem;padding:0.38rem 0.9rem"
                @click="openAddTripForOperator(selectedOperator)">
                + Thêm chuyến
              </button>
            </div>
            <div v-if="loadingOpDetail" class="loading">{{ ui.t.admin.loading }}</div>
            <div v-else-if="!opDetailTrips.length" class="loading">Chưa có chuyến nào</div>
            <div v-else class="table-wrap">
              <table>
                <thead><tr>
                  <th>ID</th><th>Tuyến</th><th>Khởi hành</th><th>Giá</th><th>Trạng thái</th><th>···</th>
                </tr></thead>
                <tbody>
                  <tr v-for="t in opDetailTrips" :key="t.id">
                    <td class="mono">#{{ t.id }}</td>
                    <td>{{ t.origin }} → {{ t.destination }}</td>
                    <td class="mono">{{ formatDateTime(t.departureTime) }}</td>
                    <td class="mono">{{ formatPrice(t.price) }}</td>
                    <td><span :class="['badge', `badge-${t.status.toLowerCase()}`]">{{ t.status }}</span></td>
                    <td>
                      <div class="action-btns">
                        <button v-if="t.status === 'OPEN'" class="act-btn act-close"
                          :disabled="togglingId === t.id" @click="toggleTripStatusInDetail(t)">
                          {{ togglingId === t.id ? '…' : '🔒' }}
                        </button>
                        <button v-else-if="t.status === 'CLOSED'" class="act-btn act-open"
                          :disabled="togglingId === t.id" @click="toggleTripStatusInDetail(t)">
                          {{ togglingId === t.id ? '…' : '🔓' }}
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- TAB: CHUYẾN XE                                        -->
      <!-- ══════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'trips'">
        <div class="section-header">
          <span class="section-title">{{ ui.t.admin.trips }}</span>
          <button class="btn-add-trip" @click="openAddTrip()" id="btn-add-trip">
            {{ ui.t.admin.addTrip }}
          </button>
        </div>

        <!-- FILTER ROW -->
        <div class="trip-filter-row">
          <div class="filter-group-inline">
            <span class="filter-label-inline">Trạng thái</span>
            <div class="filter-chips">
              <button v-for="s in ['', 'OPEN', 'CLOSED', 'CANCELLED', 'COMPLETED']" :key="s"
                :class="['chip', { active: tripFilter === s }]" @click="tripFilter = s">
                {{ s || 'Tất cả' }}
              </button>
            </div>
          </div>
          <div class="filter-group-inline">
            <span class="filter-label-inline">Nhà xe</span>
            <div class="filter-chips">
              <button :class="['chip', { active: tripOperatorFilter === '' }]" @click="tripOperatorFilter = ''">Tất cả</button>
              <button v-for="op in uniqueTripOperators" :key="op"
                :class="['chip', { active: tripOperatorFilter === op }]" @click="tripOperatorFilter = op">{{ op }}</button>
            </div>
          </div>
          <div class="filter-group-inline">
            <span class="filter-label-inline">Khung giờ</span>
            <div class="filter-chips">
              <button v-for="slot in timeSlots" :key="slot.value"
                :class="['chip', { active: tripTimeFilter === slot.value }]" @click="tripTimeFilter = slot.value">
                {{ slot.label }}
              </button>
            </div>
          </div>
          <div class="filter-result">
            <span class="result-count"><strong>{{ filteredTrips.length }}</strong> chuyến</span>
            <button v-if="tripFilter || tripOperatorFilter || tripTimeFilter" class="btn-reset-filter"
              @click="tripFilter = ''; tripOperatorFilter = ''; tripTimeFilter = ''">✕ Xoá lọc</button>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>{{ ui.t.admin.tableId }}</th>
              <th>{{ ui.t.admin.tableRoute }}</th>
              <th>{{ ui.t.admin.tableOp }}</th>
              <th>{{ ui.t.admin.tableDep }}</th>
              <th>{{ ui.t.admin.tablePrice }}</th>
              <th>{{ ui.t.admin.tableStatus }}</th>
              <th>Tài xế</th>
              <th style="width:108px">···</th>
            </tr></thead>
            <tbody>
              <tr v-if="loading"><td colspan="8" class="loading">{{ ui.t.admin.loading }}</td></tr>
              <tr v-else-if="!filteredTrips.length"><td colspan="8" class="loading">{{ ui.t.admin.noData }}</td></tr>
              <tr v-for="t in filteredTrips" :key="t.id">
                <td class="mono">#{{ t.id }}</td>
                <td><strong>{{ t.origin }}</strong> → {{ t.destination }}</td>
                <td>{{ t.operator }}</td>
                <td class="mono">{{ formatDateTime(t.departureTime) }}</td>
                <td class="mono">{{ formatPrice(t.price) }}</td>
                <td><span :class="['badge', `badge-${t.status.toLowerCase()}`]">{{ t.status }}</span></td>
                <td>
                  <select :value="t.assignedDriverId || ''" @change="assignDriver(t.id, $event.target.value)"
                    class="driver-select">
                    <option value="">— Chưa gán —</option>
                    <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.fullName }}</option>
                  </select>
                </td>
                <td>
                  <div class="action-btns">
                    <button class="act-btn act-edit" :title="ui.t.admin.editTrip" @click="openEditTrip(t)">✏️</button>
                    <button v-if="t.status === 'OPEN'" class="act-btn act-close"
                      :disabled="togglingId === t.id" @click="toggleTripStatus(t)">
                      {{ togglingId === t.id ? '…' : '🔒' }}
                    </button>
                    <button v-else-if="t.status === 'CLOSED'" class="act-btn act-open"
                      :disabled="togglingId === t.id" @click="toggleTripStatus(t)">
                      {{ togglingId === t.id ? '…' : '🔓' }}
                    </button>
                    <button class="act-btn act-delete" :title="ui.t.admin.deleteTrip" @click="deleteTrip(t)">🗑️</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- TAB: ĐẶT VÉ                                           -->
      <!-- ══════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'bookings'">
        <div class="section-header">
          <span class="section-title">{{ ui.t.admin.bookings }}</span>
          <div class="filter-bar">
            <select v-model="bookingFilter">
              <option value="">{{ ui.t.tickets.filterAll }}</option>
              <option value="PENDING">PENDING</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>

        <!-- Filter by operator -->
        <div class="trip-filter-row" style="margin-bottom:1rem">
          <div class="filter-group-inline">
            <span class="filter-label-inline">Nhà xe</span>
            <div class="filter-chips">
              <button :class="['chip', { active: bookingOperatorFilter === '' }]" @click="bookingOperatorFilter = ''">Tất cả</button>
              <button v-for="op in uniqueBookingOperators" :key="op"
                :class="['chip', { active: bookingOperatorFilter === op }]" @click="bookingOperatorFilter = op">{{ op }}</button>
            </div>
          </div>
          <div class="filter-result">
            <span class="result-count"><strong>{{ filteredBookings.length }}</strong> đơn</span>
            <button v-if="bookingFilter || bookingOperatorFilter" class="btn-reset-filter"
              @click="bookingFilter = ''; bookingOperatorFilter = ''">✕ Xoá lọc</button>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>{{ ui.t.admin.tableId }}</th>
              <th>{{ ui.t.admin.tableCustomer }}</th>
              <th>{{ ui.t.admin.tableRoute }}</th>
              <th>Nhà xe</th>
              <th>{{ ui.t.admin.tableTotal }}</th>
              <th>{{ ui.t.admin.tableBookedAt }}</th>
              <th>{{ ui.t.admin.tableStatus }}</th>
            </tr></thead>
            <tbody>
              <tr v-if="loadingBookings"><td colspan="7" class="loading">{{ ui.t.admin.loading }}</td></tr>
              <tr v-else-if="!filteredBookings.length"><td colspan="7" class="loading">{{ ui.t.admin.noData }}</td></tr>
              <tr v-for="b in filteredBookings" :key="b.id">
                <td class="mono">#{{ b.id }}</td>
                <td>{{ b.userName }}</td>
                <td>{{ b.origin }} → {{ b.destination }}</td>
                <td><span class="op-tag">{{ b.operatorName || '—' }}</span></td>
                <td class="mono">{{ formatPrice(b.totalAmount) }}</td>
                <td class="mono">{{ formatDateTime(b.createdAt) }}</td>
                <td><span :class="['badge', `badge-${b.status.toLowerCase()}`]">{{ b.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- TAB: NGƯỜI DÙNG                                        -->
      <!-- ══════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'users'">
        <div class="section-header">
          <span class="section-title">{{ ui.t.admin.users }}</span>
          <div style="display:flex;gap:0.5rem;align-items:center">
            <button class="btn-add-trip" @click="openAddUser">+ Thêm tài khoản</button>
            <div class="filter-bar">
              <select v-model="userFilter">
                <option value="">{{ ui.t.admin.allRoles }}</option>
                <option value="CUSTOMER">CUSTOMER</option>
                <option value="DRIVER">DRIVER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>{{ ui.t.admin.tableId }}</th>
              <th>{{ ui.t.admin.tableFullName }}</th>
              <th>{{ ui.t.admin.tableEmail }}</th>
              <th>{{ ui.t.admin.tableRole }}</th>
              <th>Ví</th>
              <th>Hạng</th>
              <th>{{ ui.t.admin.tableActive }}</th>
              <th>{{ ui.t.admin.tableCreated }}</th>
              <th style="width:140px">···</th>
            </tr></thead>
            <tbody>
              <tr v-if="loadingUsers"><td colspan="9" class="loading">{{ ui.t.admin.loading }}</td></tr>
              <tr v-else-if="!filteredUsers.length"><td colspan="9" class="loading">{{ ui.t.admin.noData }}</td></tr>
              <tr v-for="u in filteredUsers" :key="u.id">
                <td class="mono">#{{ u.id }}</td>
                <td>
                  <strong>{{ u.fullName }}</strong>
                  <div class="mono" style="font-size:0.72rem;color:var(--muted)">{{ u.phone || '—' }}</div>
                </td>
                <td class="mono" style="font-size:0.78rem">{{ u.email || '—' }}</td>
                <td><span :class="['badge', `badge-role-${u.role.toLowerCase()}`]">{{ u.role }}</span></td>
                <td class="mono" style="font-size:0.78rem">{{ formatPrice(u.walletBalance || 0) }}</td>
                <td :key="`tier-${u.id}-${u.loyaltyTier}`">
                    <span v-if="u.loyaltyTier === 'VIP_CUSTOMER'" class="badge" style="background:rgba(245,158,11,0.15);color:#d97706">VIP ⭐</span>
                    <span v-else class="mono" style="font-size:0.72rem">STD</span>
                </td>
                <td><span :class="['badge', u.isActive ? 'badge-open' : 'badge-cancelled']">
                    {{ u.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="mono">{{ formatDate(u.createdAt) }}</td>
                <td><div class="action-btns">
                    <!-- Không cho sửa ADMIN -->
                    <button v-if="u.role !== 'ADMIN'" class="act-btn act-edit" title="Sửa thông tin" @click="openEditUser(u)">✏️</button>
                    <!-- Chỉ nạp tiền cho CUSTOMER -->
                    <button v-if="u.role === 'CUSTOMER'" class="act-btn act-open" title="Nạp tiền" @click="openTopupUser(u)">💰</button>
                    <!-- Chỉ nâng VIP cho CUSTOMER chưa VIP -->
                    <button v-if="u.role === 'CUSTOMER' && u.loyaltyTier !== 'VIP_CUSTOMER'" class="act-btn" title="Nâng VIP"
                      style="font-size:0.8rem" @click="promoteVip(u)">⭐</button>
                    <!-- Xóa: chỉ cho CUSTOMER -->
                    <button v-if="u.role === 'CUSTOMER'" class="act-btn act-delete" title="Xóa tài khoản"
                      @click="deleteUser(u)">🗑️</button>
                    <!-- Khóa/mở: không áp dụng cho ADMIN -->
                    <button v-if="u.role !== 'ADMIN'" class="act-btn" :title="u.isActive ? 'Khóa tài khoản' : 'Mở khóa'"
                      :style="u.isActive ? 'color:#c0392b' : 'color:#2d7a4f'"
                      @click="toggleUserActive(u)">{{ u.isActive ? '🔒' : '🔓' }}</button>
                    </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- TAB: THANH TOÁN                                       -->
      <!-- ══════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'payments'">
        <div class="section-header">
          <span class="section-title">{{ ui.t.admin.payments }}</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>{{ ui.t.admin.tableId }}</th>
              <th>{{ ui.t.admin.tableBooking }}</th>
              <th>{{ ui.t.admin.tableGateway }}</th>
              <th>{{ ui.t.admin.tablePrice }}</th>
              <th>{{ ui.t.admin.tablePaidAt }}</th>
              <th>{{ ui.t.admin.tableStatus }}</th>
            </tr></thead>
            <tbody>
              <tr v-if="loadingPayments"><td colspan="6" class="loading">{{ ui.t.admin.loading }}</td></tr>
              <tr v-else-if="!payments.length"><td colspan="6" class="loading">{{ ui.t.admin.noData }}</td></tr>
              <tr v-for="p in payments" :key="p.id">
                <td class="mono">#{{ p.id }}</td>
                <td class="mono">#{{ p.bookingId }}</td>
                <td><span :class="['badge', `badge-gw-${p.gateway.toLowerCase()}`]">{{ p.gateway }}</span></td>
                <td class="mono">{{ formatPrice(p.amount) }}</td>
                <td class="mono">{{ p.paidAt ? formatDateTime(p.paidAt) : '—' }}</td>
                <td><span :class="['badge', `badge-pay-${p.status.toLowerCase()}`]">{{ p.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- TAB: THỐNG KÊ                                         -->
      <!-- ══════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'stats'">
        <div class="section-header">
          <span class="section-title">{{ ui.t.admin.stats }}</span>
          <span class="section-sub">{{ ui.t.admin.statsSubtitle }}</span>
        </div>
        <div v-if="loadingStats" class="loading">{{ ui.t.admin.loading }}</div>
        <template v-else>
          <div class="kpi-grid">
            <div class="kpi-card accent">
              <div class="kpi-label">{{ ui.t.admin.revenue }}</div>
              <div class="kpi-value">{{ formatPrice(statsData.summary?.totalRevenue) }}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">{{ ui.t.admin.success }}</div>
              <div class="kpi-value">{{ statsData.summary?.successCount || 0 }}</div>
            </div>
            <div class="kpi-card green">
              <div class="kpi-label">{{ ui.t.admin.confirmed }}</div>
              <div class="kpi-value">{{ statsData.summary?.confirmedBookings || 0 }}</div>
            </div>
            <div class="kpi-card red">
              <div class="kpi-label">{{ ui.t.admin.cancelled }}</div>
              <div class="kpi-value">{{ statsData.summary?.cancelledBookings || 0 }}</div>
            </div>
          </div>
          <div class="charts-row">
            <div class="chart-panel wide">
              <div class="chart-title">{{ ui.t.admin.revenueChart }}</div>
              <div v-if="!statsData.revenueByDay?.length" class="chart-empty">{{ ui.t.admin.noRevenue }}</div>
              <div v-else class="bar-chart-wrap">
                <div class="bar-chart">
                  <div v-for="(day, idx) in chartDays" :key="idx" class="bar-col"
                    :title="`${day.label}: ${formatPrice(day.revenue)} (${day.count} ${ui.t.admin.transactions})`">
                    <div class="bar-value-hint" v-if="day.revenue > 0">{{ formatPriceShort(day.revenue) }}</div>
                    <div class="bar" :style="{ height: barHeight(day.revenue) + '%' }"
                      :class="{ 'bar-highlight': day.revenue === maxRevenue && day.revenue > 0 }"></div>
                    <div class="bar-label">{{ day.label }}</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="chart-panel">
              <div class="chart-title">{{ ui.t.admin.bookingStatus }}</div>
              <div class="donut-wrap">
                <svg viewBox="0 0 120 120" class="donut-svg">
                  <circle cx="60" cy="60" r="48" fill="none" stroke="var(--tag-bg)" stroke-width="16"/>
                  <circle v-for="seg in donutSegments" :key="seg.label" cx="60" cy="60" r="48"
                    fill="none" :stroke="seg.color" stroke-width="16"
                    :stroke-dasharray="`${seg.dash} ${301.6 - seg.dash}`"
                    :stroke-dashoffset="seg.offset" stroke-linecap="butt"/>
                  <text x="60" y="56" text-anchor="middle" class="donut-center-num">
                    {{ statsData.summary?.totalBookings || 0 }}
                  </text>
                  <text x="60" y="68" text-anchor="middle" class="donut-center-label">
                    {{ ui.t.admin.totalOrders }}
                  </text>
                </svg>
                <div class="donut-legend">
                  <div v-for="seg in donutSegments" :key="seg.label" class="legend-item">
                    <span class="legend-dot" :style="{ background: seg.color }"></span>
                    <span>{{ seg.label }}</span>
                    <span class="legend-val">{{ seg.count }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="top-days-panel" v-if="statsData.revenueByDay?.length">
            <div class="chart-title" style="margin-bottom:0.75rem">{{ ui.t.admin.topDays }}</div>
            <div class="table-wrap">
              <table>
                <thead><tr>
                  <th>#</th><th>{{ ui.t.admin.tableCreated }}</th>
                  <th>{{ ui.t.admin.revenue }}</th>
                  <th>{{ ui.t.admin.transactions }}</th>
                  <th>{{ ui.t.admin.avg }}</th>
                </tr></thead>
                <tbody>
                  <tr v-for="(day, idx) in topDays" :key="day.day">
                    <td class="mono">{{ idx + 1 }}</td>
                    <td class="mono">{{ formatDayLabel(day.day) }}</td>
                    <td class="mono" style="color:var(--accent);font-weight:600">{{ formatPrice(day.revenue) }}</td>
                    <td class="mono">{{ day.count }} {{ ui.t.admin.transactions }}</td>
                    <td class="mono">{{ formatPrice(Math.round(day.revenue / day.count)) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>

    </div><!-- /content -->

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- MODAL: Thêm / Sửa Chuyến                              -->
    <!-- ══════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="showTripModal" class="modal-overlay" @click.self="showTripModal = false">
        <div class="modal-box" role="dialog">
          <div class="modal-header">
            <h2 class="modal-title">{{ editingTrip ? ui.t.admin.editTrip : ui.t.admin.newTrip }}</h2>
            <button class="modal-close" @click="showTripModal = false">✕</button>
          </div>
          <div v-if="loadingFormData" class="modal-loading">{{ ui.t.admin.loadingForm }}</div>
          <form v-else @submit.prevent="submitTripForm" class="modal-form">
            <div class="form-row">
              <label class="form-label">{{ ui.t.admin.formRoute }}</label>
              <select v-model="tripForm.routeId" class="form-select" required id="trip-form-route">
                <option value="">{{ ui.t.admin.chooseRoute }}</option>
                <option v-for="r in formRoutes" :key="r.id" :value="r.id">
                  {{ r.origin }} → {{ r.destination }} ({{ formatPrice(r.basePrice) }})
                </option>
              </select>
            </div>
            <div class="form-row">
              <label class="form-label">{{ ui.t.admin.formOperator }}</label>
              <select v-model="tripForm.operatorId" class="form-select" required id="trip-form-operator"
                @change="tripForm.vehicleId = ''">
                <option value="">{{ ui.t.admin.chooseOperator }}</option>
                <option v-for="o in formOperators" :key="o.id" :value="o.id">{{ o.name }}</option>
              </select>
            </div>
            <div class="form-row">
              <label class="form-label">{{ ui.t.admin.formVehicle }}</label>
              <select v-model="tripForm.vehicleId" class="form-select" required id="trip-form-vehicle">
                <option value="">{{ ui.t.admin.chooseVehicle }}</option>
                <option v-for="v in filteredFormVehicles" :key="v.id" :value="v.id">
                  {{ v.name }} — {{ v.vehicleType }} ({{ v.totalSeats }} ghế)
                </option>
              </select>
              <!-- Thông báo khi nhà xe đã chọn nhưng chưa có xe -->
              <div v-if="tripForm.operatorId && filteredFormVehicles.length === 0"
                class="vehicle-empty-hint">
                ⚠️ Nhà xe này chưa có xe nào.
                <button type="button" class="link-btn"
                  @click="openAddVehicleFromTrip()">
                  + Thêm xe ngay
                </button>
              </div>
            </div>
            <div class="form-row-2">
              <div class="form-col">
                <label class="form-label">{{ ui.t.admin.formDeparture }}</label>
                <input v-model="tripForm.departureTime" type="datetime-local" class="form-input" required id="trip-form-departure"/>
              </div>
              <div class="form-col">
                <label class="form-label">{{ ui.t.admin.formArrival }}</label>
                <input v-model="tripForm.arrivalTime" type="datetime-local" class="form-input" required id="trip-form-arrival"/>
              </div>
            </div>
            <div class="form-row">
              <label class="form-label">{{ ui.t.admin.formPrice }}</label>
              <input v-model="tripForm.priceOverride" type="number" min="0" step="1000"
                class="form-input" :placeholder="ui.t.admin.formPricePlaceholder" id="trip-form-price"/>
            </div>
            <p v-if="formError" class="form-error">{{ formError }}</p>
            <div class="modal-actions">
              <button type="button" class="btn-cancel" @click="showTripModal = false">{{ ui.t.admin.cancel }}</button>
              <button type="submit" class="btn-save" :disabled="savingTrip" id="btn-save-trip">
                {{ savingTrip ? ui.t.admin.saving : ui.t.admin.saveTrip }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: Thêm / Sửa Nhà xe -->
      <div v-if="showOperatorModal" class="modal-overlay" @click.self="showOperatorModal = false">
        <div class="modal-box" role="dialog">
          <div class="modal-header">
            <h2 class="modal-title">{{ editingOperator ? ui.t.admin.editOperator : ui.t.admin.newOperator }}</h2>
            <button class="modal-close" @click="showOperatorModal = false">✕</button>
          </div>
          <form @submit.prevent="submitOperatorForm" class="modal-form">
            <div class="form-row">
              <label class="form-label">{{ ui.t.admin.opName }}</label>
              <input v-model="operatorForm.name" type="text" class="form-input" required
                placeholder="VD: Phương Trang" id="op-form-name"/>
            </div>
            <div class="form-row">
              <label class="form-label">{{ ui.t.admin.opHotline }}</label>
              <input v-model="operatorForm.hotline" type="text" class="form-input"
                placeholder="VD: 1900 6067" id="op-form-hotline"/>
            </div>
            <div class="form-row">
              <label class="form-label">{{ ui.t.admin.opDesc }}</label>
              <textarea v-model="operatorForm.description" class="form-input" rows="3"
                placeholder="Mô tả ngắn về nhà xe..." id="op-form-desc"
                style="resize:vertical;min-height:72px"></textarea>
            </div>
            <p v-if="opFormError" class="form-error">{{ opFormError }}</p>
            <div class="modal-actions">
              <button type="button" class="btn-cancel" @click="showOperatorModal = false">{{ ui.t.admin.cancel }}</button>
              <button type="submit" class="btn-save" :disabled="savingOperator" id="btn-save-operator">
                {{ savingOperator ? ui.t.admin.saving : ui.t.admin.saveOperator }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: Thêm Xe -->
      <div v-if="showVehicleModal" class="modal-overlay" @click.self="showVehicleModal = false">
        <div class="modal-box" role="dialog" style="max-width:460px">
          <div class="modal-header">
            <h2 class="modal-title">Thêm Xe Mới</h2>
            <button class="modal-close" @click="showVehicleModal = false">✕</button>
          </div>
          <form @submit.prevent="submitVehicleForm" class="modal-form">
            <!-- Nhà xe -->
            <div class="form-row">
              <label class="form-label">Nhà xe *</label>
              <select v-model="vehicleForm.operatorId" class="form-select" required id="veh-form-operator">
                <option value="">-- Chọn nhà xe --</option>
                <option v-for="o in operators" :key="o.id" :value="o.id">{{ o.name }}</option>
              </select>
            </div>
            <!-- Loại xe -->
            <div class="form-row">
              <label class="form-label">Loại xe *</label>
              <input
                v-model="vehicleForm.vehicleTypeName"
                type="text"
                class="form-input"
                required
                placeholder="VD: Limousine 16, Giường nằm 40..."
                id="veh-form-type"
              />
              <span style="font-size:0.75rem;color:var(--muted);margin-top:0.25rem">
                Nhập tên loại xe mới hoặc tên đã có. Hệ thống tự tạo nếu chưa tồn tại.
              </span>
            </div>

            <div class="form-row">
              <label class="form-label">Số ghế *</label>
              <input
                v-model.number="vehicleForm.totalSeats"
                type="number"
                min="1"
                max="60"
                class="form-input"
                required
                placeholder="VD: 16, 34, 40..."
                id="veh-form-seats"
              />
              <span style="font-size:0.75rem;color:var(--muted);margin-top:0.25rem">
                Số ghế sẽ được dùng để tạo sơ đồ chọn ghế cho khách hàng.
              </span>
            </div>
            <!-- Biển số -->
            <div class="form-row">
              <label class="form-label">Biển số xe *</label>
              <input v-model="vehicleForm.licensePlate" type="text" class="form-input" required
                placeholder="VD: 51B-123.45" id="veh-form-plate"
                style="text-transform:uppercase"/>
            </div>
            <!-- Tên xe -->
            <div class="form-row">
              <label class="form-label">Tên xe (tùy chọn)</label>
              <input v-model="vehicleForm.name" type="text" class="form-input"
                placeholder="VD: Giường nằm VIP" id="veh-form-name"/>
            </div>
            <p v-if="vehFormError" class="form-error">{{ vehFormError }}</p>
            <div class="modal-actions">
              <button type="button" class="btn-cancel" @click="showVehicleModal = false">Hủy</button>
              <button type="submit" class="btn-save" :disabled="savingVehicle" id="btn-save-vehicle">
                {{ savingVehicle ? 'Đang lưu...' : 'Thêm xe' }}
              </button>
            </div>
          </form>
        </div>
      </div>
      <!-- MODAL: Thêm / Sửa User -->
      <div v-if="showUserModal" class="modal-overlay" @click.self="showUserModal = false">
        <div class="modal-box" role="dialog" style="max-width:480px">
          <div class="modal-header">
            <h2 class="modal-title">{{ editingUser ? 'Sửa tài khoản' : 'Thêm tài khoản mới' }}</h2>
            <button class="modal-close" @click="showUserModal = false">✕</button>
          </div>
          <form @submit.prevent="submitUserForm" class="modal-form">

            <div class="form-row">
              <label class="form-label">Họ và tên *</label>
              <input v-model="userForm.fullName" type="text" class="form-input" required
                placeholder="Nguyễn Văn A" />
            </div>

            <div class="form-row-2">
              <div class="form-col">
                <label class="form-label">Số điện thoại</label>
                <input v-model="userForm.phone" type="tel" class="form-input"
                  placeholder="0901234567" />
              </div>
              <div class="form-col">
                <label class="form-label">Email</label>
                <input v-model="userForm.email" type="email" class="form-input"
                  placeholder="email@gmail.com" />
              </div>
            </div>

            <div class="form-row" v-if="!editingUser">
              <label class="form-label">Mật khẩu * (tối thiểu 6 ký tự)</label>
              <input v-model="userForm.password" type="password" class="form-input"
                placeholder="••••••" />
            </div>

            <div class="form-row" v-if="!editingUser">
              <label class="form-label">Vai trò</label>
              <select v-model="userForm.role" class="form-select">
                <option value="CUSTOMER">CUSTOMER</option>
                <option value="DRIVER">DRIVER</option>
              </select>
            </div>

            <!-- Phân quyền khi đang sửa -->
            <div class="form-row" v-if="editingUser">
              <label class="form-label">Vai trò</label>
              <div style="display:flex;gap:0.5rem">
                <button type="button"
                  :class="['chip', editingUser.role === 'CUSTOMER' ? 'active' : '']"
                  @click="changeRole(editingUser, 'CUSTOMER')">CUSTOMER</button>
                <button type="button"
                  :class="['chip', editingUser.role === 'DRIVER' ? 'active' : '']"
                  @click="changeRole(editingUser, 'DRIVER')">DRIVER</button>
              </div>
              <span style="font-size:0.72rem;color:var(--muted);margin-top:0.3rem">
                Vai trò hiện tại: <strong>{{ editingUser.role }}</strong>
              </span>
            </div>

            <p v-if="userFormError" class="form-error">{{ userFormError }}</p>

            <div class="modal-actions">
              <button type="button" class="btn-cancel" @click="showUserModal = false">Hủy</button>
              <button type="submit" class="btn-save" :disabled="savingUser">
                {{ savingUser ? 'Đang lưu...' : (editingUser ? 'Cập nhật' : 'Tạo tài khoản') }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: Nạp tiền hộ -->
      <div v-if="showTopupModal" class="modal-overlay" @click.self="showTopupModal = false">
        <div class="modal-box" role="dialog" style="max-width:400px">
          <div class="modal-header">
            <h2 class="modal-title">Nạp tiền hộ</h2>
            <button class="modal-close" @click="showTopupModal = false">✕</button>
          </div>
          <form @submit.prevent="submitTopup" class="modal-form">

            <div style="background:var(--tag-bg);border-radius:8px;padding:0.85rem 1rem;margin-bottom:0.5rem">
              <div style="font-size:0.78rem;color:var(--muted)">Tài khoản</div>
              <div style="font-weight:600;margin-top:0.2rem">{{ topupUser?.fullName }}</div>
              <div style="font-size:0.8rem;color:var(--muted)">
                Số dư hiện tại: <strong style="color:var(--accent)">{{ formatPrice(topupUser?.walletBalance || 0) }}</strong>
              </div>
            </div>

            <div class="form-row">
              <label class="form-label">Số tiền nạp (đ) *</label>
              <input v-model="topupAmount" type="number" min="10000" step="10000"
                class="form-input" placeholder="VD: 100000" required />
            </div>

            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.5rem;margin-bottom:0.5rem">
              <button v-for="amt in [50000,100000,200000,500000]" :key="amt"
                type="button" class="btn-amt" @click="topupAmount = amt">
                +{{ formatPrice(amt) }}
              </button>
            </div>

            <p v-if="topupFormError" class="form-error">{{ topupFormError }}</p>

            <div class="modal-actions">
              <button type="button" class="btn-cancel" @click="showTopupModal = false">Hủy</button>
              <button type="submit" class="btn-save" :disabled="savingTopup">
                {{ savingTopup ? 'Đang nạp...' : 'Xác nhận nạp tiền' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
    


  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'
import api from '../services/api'

const router = useRouter()
const auth   = useAuthStore()
const ui     = useUiStore()

// ── Tabs ──
const activeTab = ref('operators')
const tabs = computed(() => [
  { key: 'operators', label: ui.t.admin.tabs.operators },
  { key: 'trips',     label: ui.t.admin.tabs.trips },
  { key: 'bookings',  label: ui.t.admin.tabs.bookings },
  { key: 'users',     label: ui.t.admin.tabs.users },
  { key: 'payments',  label: ui.t.admin.tabs.payments },
  { key: 'stats',     label: ui.t.admin.tabs.stats },
])

// ── Data refs ──
const trips    = ref([])
const drivers  = ref([])
const bookings = ref([])
const users    = ref([])
const payments = ref([])
const statsData = ref({ revenueByDay: [], summary: {} })

// ── Operators state ──
const operators          = ref([])
const selectedOperator   = ref(null)
const operatorDetailTab  = ref('info')
const opDetailVehicles   = ref([])
const opDetailTrips      = ref([])
const loadingOperators   = ref(false)
const loadingOpDetail    = ref(false)

// ── User CRUD state ──
const showUserModal     = ref(false)
const showTopupModal    = ref(false)
const editingUser       = ref(null)
const topupUser         = ref(null)
const savingUser        = ref(false)
const savingTopup       = ref(false)
const userFormError     = ref('')
const topupFormError    = ref('')
const topupAmount       = ref('')

const userForm = ref({
  fullName: '', phone: '', email: '', password: '', role: 'CUSTOMER'
})

// ── Operator modal ──
const showOperatorModal  = ref(false)
const editingOperator    = ref(null)
const savingOperator     = ref(false)
const opFormError        = ref('')
const operatorForm       = ref({ name: '', hotline: '', description: '' })

// ── Vehicle modal ──
const showVehicleModal   = ref(false)
const savingVehicle      = ref(false)
const vehFormError       = ref('')
const loadingVehicleTypes = ref(false)
const vehicleTypes       = ref([])
const vehicleForm = ref({ operatorId: '', vehicleTypeId: '', vehicleTypeName: '', licensePlate: '', name: '', totalSeats: 16 })
const vehicleFromTripContext = ref(false)

// ── Mini-tabs for operator detail ──
const operatorMiniTabs = computed(() => [
  { key: 'info',     label: ui.t.admin.opInfo },
  { key: 'vehicles', label: ui.t.admin.opVehicles, count: opDetailVehicles.value.length },
  { key: 'trips',    label: ui.t.admin.opTrips,    count: opDetailTrips.value.length },
])

// ── Loading ──
const loading         = ref(false)
const loadingBookings = ref(false)
const loadingUsers    = ref(false)
const loadingPayments = ref(false)
const loadingStats    = ref(false)

// ── Trip CRUD state ──
const showTripModal   = ref(false)
const editingTrip     = ref(null)
const savingTrip      = ref(false)
const togglingId      = ref(null)
const loadingFormData = ref(false)
const formError       = ref('')
const formRoutes      = ref([])
const formVehicles    = ref([])
const formOperators   = ref([])

const tripForm = ref({
  routeId: '', operatorId: '', vehicleId: '',
  departureTime: '', arrivalTime: '', priceOverride: '',
})

const filteredFormVehicles = computed(() => {
  if (!tripForm.value.operatorId) return formVehicles.value
  return formVehicles.value.filter(v => v.operatorId == tripForm.value.operatorId)
})

// ── Filters ──
const tripFilter          = ref('')
const tripOperatorFilter  = ref('')
const tripTimeFilter      = ref('')
const bookingFilter       = ref('')
const bookingOperatorFilter = ref('')
const userFilter          = ref('')

const timeSlots = [
  { value: '',          label: 'Tất cả' },
  { value: 'morning',   label: '🌅 Sáng (00–12h)' },
  { value: 'afternoon', label: '☀️ Chiều (12–18h)' },
  { value: 'evening',   label: '🌙 Tối (18–24h)' },
]

// ── Summary cards ──
const summaryCards = computed(() => [
  { label: ui.t.admin.tabs.operators, value: operators.value.length },
  { label: ui.t.admin.tabs.trips,     value: trips.value.length },
  { label: ui.t.admin.tabs.bookings,  value: bookings.value.length },
  { label: ui.t.admin.revenue,        value: formatPrice(
      payments.value.filter(p => p.status === 'SUCCESS').reduce((s, p) => s + Number(p.amount), 0)
    )
  },
])

// ── Computed filters ──
const uniqueTripOperators = computed(() => [...new Set(trips.value.map(t => t.operator))])
const uniqueBookingOperators = computed(() => [...new Set(bookings.value.map(b => b.operatorName).filter(Boolean))])

const filteredTrips = computed(() => {
  let list = trips.value
  if (tripFilter.value)         list = list.filter(t => t.status === tripFilter.value)
  if (tripOperatorFilter.value) list = list.filter(t => t.operator === tripOperatorFilter.value)
  if (tripTimeFilter.value) {
    list = list.filter(t => {
      const h = new Date(t.departureTime).getHours()
      if (tripTimeFilter.value === 'morning')   return h >= 0  && h < 12
      if (tripTimeFilter.value === 'afternoon') return h >= 12 && h < 18
      if (tripTimeFilter.value === 'evening')   return h >= 18 && h < 24
      return true
    })
  }
  return list
})

const filteredBookings = computed(() => {
  let list = bookings.value
  if (bookingFilter.value)         list = list.filter(b => b.status === bookingFilter.value)
  if (bookingOperatorFilter.value) list = list.filter(b => b.operatorName === bookingOperatorFilter.value)
  return list
})

const filteredUsers = computed(() =>
  userFilter.value ? users.value.filter(u => u.role === userFilter.value) : users.value
)

// ── Chart data ──
const chartDays = computed(() => {
  const map = {}
  ;(statsData.value.revenueByDay || []).forEach(d => {
    map[d.day?.toString().substring(0, 10)] = d
  })
  const result = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().substring(0, 10)
    const found = map[key]
    result.push({
      label:   `${d.getDate()}/${d.getMonth() + 1}`,
      revenue: found ? found.revenue : 0,
      count:   found ? found.count : 0,
    })
  }
  return result
})
const maxRevenue = computed(() => Math.max(...chartDays.value.map(d => d.revenue), 1))
function barHeight(rev) { return Math.max((rev / maxRevenue.value) * 100, rev > 0 ? 4 : 0) }

const donutSegments = computed(() => {
  const s = statsData.value.summary || {}
  const total = s.totalBookings || 0
  if (!total) return []
  const items = [
    { label: ui.t.tickets.statusConf, count: s.confirmedBookings || 0, color: '#2d7a4f' },
    { label: ui.t.tickets.statusPend, count: s.pendingBookings   || 0, color: '#f0a500' },
    { label: ui.t.tickets.statusCanc, count: s.cancelledBookings || 0, color: '#c0392b' },
  ]
  const circ = 301.6
  let cumulative = 0
  return items.map(item => {
    const dash = (item.count / total) * circ
    const offset = circ - cumulative + circ * 0.25
    cumulative += dash
    return { ...item, dash, offset }
  })
})

const topDays = computed(() =>
  [...(statsData.value.revenueByDay || [])].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
)

// ── Lifecycle ──
onMounted(() => {
  loadOperators()
  loadTrips()
  loadDrivers()
  loadBookings()
  loadUsers()
  loadPayments()
})

function switchTab(key) {
  activeTab.value = key
  if (key === 'stats' && !statsData.value.revenueByDay?.length) loadStats()
}

// ── User CRUD functions ──
function openAddUser() {
  editingUser.value = null
  userFormError.value = ''
  userForm.value = { fullName: '', phone: '', email: '', password: '', role: 'CUSTOMER' }
  showUserModal.value = true
}

function openEditUser(u) {
  editingUser.value = u
  userFormError.value = ''
  userForm.value = {
    fullName: u.fullName || '',
    phone:    u.phone || '',
    email:    u.email || '',
    password: '',
    role:     u.role,
  }
  showUserModal.value = true
}

async function submitUserForm() {
  userFormError.value = ''
  const f = userForm.value
  if (!f.fullName?.trim()) { userFormError.value = 'Họ tên là bắt buộc'; return }
  if (!editingUser.value && !f.phone && !f.email) { userFormError.value = 'Cần SĐT hoặc email'; return }
  if (!editingUser.value && (!f.password || f.password.length < 6)) {
    userFormError.value = 'Mật khẩu tối thiểu 6 ký tự'; return
  }
  savingUser.value = true
  try {
    if (editingUser.value) {
      const res = await api.put(`/admin/users/${editingUser.value.id}`, {
        fullName: f.fullName,
        phone:    f.phone || null,
        email:    f.email || null,
      })
      const idx = users.value.findIndex(u => u.id === editingUser.value.id)
      if (idx !== -1) users.value[idx] = { ...users.value[idx], ...res.data }
    } else {
      const res = await api.post('/admin/users', {
        fullName: f.fullName,
        phone:    f.phone || null,
        email:    f.email || null,
        password: f.password,
        role:     f.role,
      })
      users.value.unshift({
        ...res.data,
        walletBalance: 0,
        loyaltyTier: 'STANDARD',
        isActive: true,
      })
    }
    showUserModal.value = false
  } catch (e) {
    userFormError.value = e.response?.data?.error || 'Lỗi khi lưu tài khoản'
  } finally {
    savingUser.value = false
  }
}

async function toggleUserActive(u) {
  const action = u.isActive ? 'khóa' : 'mở khóa'
  if (!confirm(`Bạn có chắc muốn ${action} tài khoản ${u.fullName}?`)) return
  try {
    await api.put(`/admin/users/${u.id}`, { isActive: !u.isActive })
    const idx = users.value.findIndex(x => x.id === u.id)
    if (idx !== -1) users.value[idx].isActive = !u.isActive
  } catch (e) {
    alert(e.response?.data?.error || 'Lỗi khi thay đổi trạng thái')
  }
}

async function promoteVip(u) {
  if (!confirm(`Nâng ${u.fullName} lên VIP_CUSTOMER?`)) return
  try {
    await api.put(`/admin/users/${u.id}/vip`)
    const idx = users.value.findIndex(x => x.id === u.id)
    if (idx !== -1) {
      // Dùng splice để Vue detect thay đổi
      users.value.splice(idx, 1, { ...users.value[idx], loyaltyTier: 'VIP_CUSTOMER' })
    }
    alert(`✅ Đã nâng ${u.fullName} lên VIP!`)
  } catch (e) {
    alert(e.response?.data?.error || 'Lỗi khi nâng VIP')
  }
}

async function deleteUser(u) {
  if (!confirm(`Xóa tài khoản "${u.fullName}"?\nTài khoản sẽ bị khóa và ẩn khỏi danh sách.`)) return
  try {
    await api.delete(`/admin/users/${u.id}`)
    users.value = users.value.filter(x => x.id !== u.id)
    if (showUserModal.value && editingUser.value?.id === u.id) {
      showUserModal.value = false
    }
  } catch (e) {
    alert(e.response?.data?.error || 'Lỗi khi xóa tài khoản')
  }
}

async function changeRole(u, newRole) {
  if (u.role === newRole) return
  if (!confirm(`Chuyển ${u.fullName} sang role ${newRole}?`)) return
  try {
    await api.put(`/admin/users/${u.id}/role`, { role: newRole })
    const idx = users.value.findIndex(x => x.id === u.id)
    if (idx !== -1) {
      users.value[idx].role = newRole
      editingUser.value = { ...editingUser.value, role: newRole }
    }
  } catch (e) {
    alert(e.response?.data?.error || 'Lỗi khi phân quyền')
  }
}

function openTopupUser(u) {
  topupUser.value = u
  topupAmount.value = ''
  topupFormError.value = ''
  showTopupModal.value = true
}

async function submitTopup() {
  topupFormError.value = ''
  const amount = Number(topupAmount.value)
  if (!amount || amount < 10000) {
    topupFormError.value = 'Số tiền tối thiểu 10.000đ'; return
  }
  savingTopup.value = true
  try {
    const res = await api.post(`/admin/users/${topupUser.value.id}/topup`, { amount })
    const idx = users.value.findIndex(u => u.id === topupUser.value.id)
    if (idx !== -1) users.value[idx].walletBalance = res.data.walletBalance
    showTopupModal.value = false
  } catch (e) {
    topupFormError.value = e.response?.data?.error || 'Lỗi khi nạp tiền'
  } finally {
    savingTopup.value = false
  }
}

// ── Loaders ──
async function loadOperators() {
  loadingOperators.value = true
  try { const res = await api.get('/admin/operators'); operators.value = res.data }
  catch { operators.value = [] }
  finally { loadingOperators.value = false }
}

async function loadTrips() {
  loading.value = true
  try { const res = await api.get('/admin/trips'); trips.value = res.data }
  catch { trips.value = [] }
  finally { loading.value = false }
}

async function loadDrivers() {
  try {
    const res = await api.get('/admin/users', { params: { role: 'DRIVER' } })
    drivers.value = res.data
  } catch { drivers.value = [] }
}

async function loadBookings() {
  loadingBookings.value = true
  try { const res = await api.get('/admin/bookings'); bookings.value = res.data }
  catch { bookings.value = [] }
  finally { loadingBookings.value = false }
}

async function loadUsers() {
  loadingUsers.value = true
  try {
    const res = await api.get('/admin/users')
    users.value = res.data.map(u => ({
      ...u,
      walletBalance: u.walletBalance || 0,
      loyaltyTier:   u.loyaltyTier || 'STANDARD',
    }))
  } catch { users.value = [] }
  finally { loadingUsers.value = false }
}

async function loadPayments() {
  loadingPayments.value = true
  try { const res = await api.get('/admin/payments'); payments.value = res.data }
  catch { payments.value = [] }
  finally { loadingPayments.value = false }
}

async function loadStats() {
  loadingStats.value = true
  try { const res = await api.get('/admin/stats'); statsData.value = res.data }
  catch { statsData.value = { revenueByDay: [], summary: {} } }
  finally { loadingStats.value = false }
}

// ── Operator CRUD ──
async function selectOperator(op) {
  if (selectedOperator.value?.id === op.id) { selectedOperator.value = null; return }
  selectedOperator.value = op
  operatorDetailTab.value = 'info'
  opDetailVehicles.value = []
  opDetailTrips.value = []
  loadOpDetail(op.id)
}

async function loadOpDetail(id) {
  loadingOpDetail.value = true
  try {
    const res = await api.get(`/admin/operators/${id}`)
    opDetailVehicles.value = res.data.vehicles
    opDetailTrips.value    = res.data.trips
  } catch { }
  finally { loadingOpDetail.value = false }
}

function openAddOperator() {
  editingOperator.value = null
  opFormError.value = ''
  operatorForm.value = { name: '', hotline: '', description: '' }
  showOperatorModal.value = true
}

function openEditOperator(op) {
  editingOperator.value = op
  opFormError.value = ''
  operatorForm.value = { name: op.name, hotline: op.hotline || '', description: op.description || '' }
  showOperatorModal.value = true
}

async function submitOperatorForm() {
  opFormError.value = ''
  if (!operatorForm.value.name?.trim()) { opFormError.value = 'Tên nhà xe là bắt buộc'; return }
  savingOperator.value = true
  try {
    if (editingOperator.value) {
      const res = await api.put(`/admin/operators/${editingOperator.value.id}`, operatorForm.value)
      const idx = operators.value.findIndex(o => o.id === editingOperator.value.id)
      if (idx !== -1) {
        operators.value[idx] = { ...operators.value[idx], ...res.data }
        if (selectedOperator.value?.id === editingOperator.value.id)
          selectedOperator.value = { ...selectedOperator.value, ...res.data }
      }
    } else {
      const res = await api.post('/admin/operators', operatorForm.value)
      operators.value.unshift(res.data)
    }
    showOperatorModal.value = false
  } catch (e) {
    opFormError.value = e.response?.data?.error || 'Lỗi khi lưu nhà xe'
  } finally {
    savingOperator.value = false
  }
}

async function toggleOperatorStatus(op) {
  const newActive = !op.isActive
  try {
    await api.put(`/admin/operators/${op.id}`, { isActive: newActive })
    op.isActive = newActive
    if (selectedOperator.value?.id === op.id) selectedOperator.value.isActive = newActive
  } catch (e) {
    alert(e.response?.data?.error || 'Lỗi khi thay đổi trạng thái nhà xe')
  }
}

// ── Vehicle CRUD ──
async function loadVehicleTypes() {
  //if (vehicleTypes.value.length) return  
  loadingVehicleTypes.value = true
  try {
    const res = await api.get('/admin/vehicle-types')
    vehicleTypes.value = res.data
  } catch { vehicleTypes.value = [] }
  finally { loadingVehicleTypes.value = false }
}

async function openAddVehicle(op) {
  vehicleFromTripContext.value = false
  vehFormError.value = ''
  vehicleForm.value = { operatorId: op?.id || '', vehicleTypeId: '', vehicleTypeName: '', licensePlate: '', name: '', totalSeats: 16 }
  await loadVehicleTypes()  // ← chờ data xong mới mở modal
  showVehicleModal.value = true
}

// Mở từ trip form (giữ lại operatorId hiện tại)
async function openAddVehicleFromTrip() {
  vehicleFromTripContext.value = true
  vehFormError.value = ''
  vehicleForm.value = {
    operatorId:    tripForm.value.operatorId || '',
    vehicleTypeId: '',
    licensePlate:  '',
    name:          '',
    totalSeats:    16,
  }
  await loadVehicleTypes()  // ← chờ data xong mới mở modal
  showVehicleModal.value = true
}

async function submitVehicleForm() {
  vehFormError.value = ''
  const f = vehicleForm.value
  if (!f.operatorId || !f.vehicleTypeName?.trim() || !f.licensePlate?.trim()) {
  vehFormError.value = 'Vui lòng điền đầy đủ thông tin bắt buộc'
  return
  }
  if (!f.totalSeats || f.totalSeats < 1 || f.totalSeats > 60) {
    vehFormError.value = 'Số ghế phải từ 1 đến 60'
    return
  }
  savingVehicle.value = true
  try {
    // Tìm hoặc tạo vehicle type theo tên
    let vehicleTypeId = null
    const existing = vehicleTypes.value.find(
      t => t.name.toLowerCase().trim() === f.vehicleTypeName.toLowerCase().trim()
    )
    if (existing && existing.totalSeats === f.totalSeats) {
  // Trùng tên VÀ trùng số ghế → dùng lại
  vehicleTypeId = existing.id
  } else if (existing && existing.totalSeats !== f.totalSeats) {
  // Trùng tên nhưng khác số ghế → tạo loại xe mới với tên khác một chút
  const vtRes = await api.post('/admin/vehicle-types', {
    name: `${f.vehicleTypeName.trim()} (${f.totalSeats} ghế)`,
    totalSeats: f.totalSeats,
    floors: f.totalSeats > 20 ? 2 : 1,
  })
  vehicleTypeId = vtRes.data.id
  vehicleTypes.value.push(vtRes.data)
}  else {
      // Tạo mới vehicle type
      const vtRes = await api.post('/admin/vehicle-types', {
        name: f.vehicleTypeName.trim(),
        totalSeats: f.totalSeats,
        floors: f.totalSeats > 20 ? 2 : 1,
      })
      vehicleTypeId = vtRes.data.id
      vehicleTypes.value.push(vtRes.data)
    }

    const res = await api.post('/admin/vehicles', {
      operatorId:    Number(f.operatorId),
      vehicleTypeId: vehicleTypeId,
      licensePlate:  f.licensePlate.trim(),
      name:          f.name?.trim() || null,
    })
    const newVehicle = res.data
    formVehicles.value.push(newVehicle)
    if (selectedOperator.value?.id === Number(f.operatorId)) {
      opDetailVehicles.value.push(newVehicle)
      const op = operators.value.find(o => o.id === Number(f.operatorId))
      if (op) op.vehicleCount++
    }
    if (vehicleFromTripContext.value) {
      tripForm.value.vehicleId = newVehicle.id
    }
    showVehicleModal.value = false
  } catch (e) {
    vehFormError.value = e.response?.data?.error || 'Lỗi khi thêm xe'
  } finally {
    savingVehicle.value = false
  }
}

async function deleteVehicle(vehicle, op) {
  if (!confirm(`Xóa xe ${vehicle.name || vehicle.licensePlate}? Hành động này không thể hoàn tác.`)) return
  try {
    await api.delete(`/admin/vehicles/${vehicle.id}`)
    opDetailVehicles.value = opDetailVehicles.value.filter(v => v.id !== vehicle.id)
    formVehicles.value = formVehicles.value.filter(v => v.id !== vehicle.id)
    if (op) {
      const o = operators.value.find(x => x.id === op.id)
      if (o) o.vehicleCount = Math.max(0, o.vehicleCount - 1)
    }
  } catch (e) {
    alert(e.response?.data?.error || 'Lỗi khi xóa xe')
  }
}

async function loadFormData() {
  loadingFormData.value = true
  try {
    const [rRes, vRes, oRes] = await Promise.all([
      api.get('/admin/routes'),
      api.get('/admin/vehicles'),
      api.get('/admin/operators'),
    ])
    formRoutes.value    = rRes.data
    formVehicles.value  = vRes.data
    formOperators.value = oRes.data
  } catch (e) {
    formError.value = 'Không tải được dữ liệu form'
  } finally {
    loadingFormData.value = false
  }
}

function openAddTrip(prefilledOperator = null) {
  editingTrip.value = null
  formError.value = ''
  tripForm.value = {
    routeId: '', operatorId: prefilledOperator?.id || '', vehicleId: '',
    departureTime: '', arrivalTime: '', priceOverride: '',
  }
  showTripModal.value = true
  loadFormData()
}

function openAddTripForOperator(op) {
  openAddTrip(op)
}

function openEditTrip(trip) {
  editingTrip.value = trip
  formError.value = ''
  const toLocal = (dt) => {
    if (!dt) return ''
    const d = new Date(dt)
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  tripForm.value = {
    routeId:       trip.routeId    || '',
    operatorId:    trip.operatorId || '',
    vehicleId:     trip.vehicleId  || '',
    departureTime: toLocal(trip.departureTime),
    arrivalTime:   toLocal(trip.arrivalTime),
    priceOverride: trip.priceOverride ?? '',
  }
  showTripModal.value = true
  loadFormData()
}

async function submitTripForm() {
  formError.value = ''
  const f = tripForm.value
  if (!f.routeId || !f.operatorId || !f.vehicleId || !f.departureTime || !f.arrivalTime) {
    formError.value = ui.t.admin.errRequired; return
  }
  if (new Date(f.arrivalTime) <= new Date(f.departureTime)) {
    formError.value = ui.t.admin.errArrival; return
  }
  savingTrip.value = true
  try {
    const payload = {
      routeId:       Number(f.routeId),
      operatorId:    Number(f.operatorId),
      vehicleId:     Number(f.vehicleId),
      departureTime: new Date(f.departureTime).toISOString(),
      arrivalTime:   new Date(f.arrivalTime).toISOString(),
      priceOverride: f.priceOverride !== '' && f.priceOverride !== null ? Number(f.priceOverride) : null,
    }
    if (editingTrip.value) {
      const res = await api.put(`/admin/trips/${editingTrip.value.id}`, payload)
      const idx = trips.value.findIndex(t => t.id === editingTrip.value.id)
      if (idx !== -1) trips.value.splice(idx, 1, res.data)
    } else {
      const res = await api.post('/admin/trips', payload)
      trips.value.unshift(res.data)
      // Refresh operator detail nếu đang xem
      if (selectedOperator.value && res.data.operatorId === selectedOperator.value.id) {
        opDetailTrips.value.unshift(res.data)
        const op = operators.value.find(o => o.id === selectedOperator.value.id)
        if (op) op.tripCount++
      }
    }
    showTripModal.value = false
  } catch (e) {
    formError.value = e.response?.data?.error || 'Lỗi khi lưu chuyến'
  } finally {
    savingTrip.value = false
  }
}

async function assignDriver(tripId, driverId) {
  try {
    await api.put(`/admin/trips/${tripId}`, { assignedDriverId: driverId ? Number(driverId) : null })
    const trip = trips.value.find(t => t.id === tripId)
    if (trip) {
      trip.assignedDriverId = driverId ? Number(driverId) : null
      const driver = drivers.value.find(d => d.id == driverId)
      trip.assignedDriverName = driver?.fullName || null
    }
  } catch (e) {
    alert(e.response?.data?.error || 'Lỗi khi phân công tài xế')
  }
}

async function toggleTripStatus(trip) {
  const newStatus = trip.status === 'OPEN' ? 'CLOSED' : 'OPEN'
  togglingId.value = trip.id
  try {
    await api.put(`/admin/trips/${trip.id}`, { status: newStatus })
    trip.status = newStatus
  } catch (e) {
    alert(e.response?.data?.error || 'Lỗi khi thay đổi trạng thái')
  } finally { togglingId.value = null }
}

async function toggleTripStatusInDetail(trip) {
  const newStatus = trip.status === 'OPEN' ? 'CLOSED' : 'OPEN'
  togglingId.value = trip.id
  try {
    await api.put(`/admin/trips/${trip.id}`, { status: newStatus })
    trip.status = newStatus
    // Sync với trips list
    const t = trips.value.find(x => x.id === trip.id)
    if (t) t.status = newStatus
  } catch (e) {
    alert(e.response?.data?.error || 'Lỗi khi thay đổi trạng thái')
  } finally { togglingId.value = null }
}

async function deleteTrip(trip) {
  const confirmMsg = ui.t.admin.confirmDelete.replace('#ID', `#${trip.id}`)
  if (!confirm(confirmMsg)) return
  try {
    await api.delete(`/admin/trips/${trip.id}`)
    trips.value = trips.value.filter(t => t.id !== trip.id)
    // Sync với opDetailTrips nếu có
    opDetailTrips.value = opDetailTrips.value.filter(t => t.id !== trip.id)
  } catch (e) {
    alert(e.response?.data?.error || 'Lỗi khi xóa chuyến')
  }
}

// ── Helpers ──
function logout() { auth.logout(); router.push('/login') }

function formatPrice(p) {
  if (!p) return ui.locale === 'vi' ? '0đ' : '0 VND'
  return parseInt(p || 0).toLocaleString(ui.locale === 'vi' ? 'vi-VN' : 'en-US') + (ui.locale === 'vi' ? 'đ' : ' VND')
}
function formatPriceShort(p) {
  if (p >= 1_000_000) return (p / 1_000_000).toFixed(1) + 'M'
  if (p >= 1_000)     return (p / 1_000).toFixed(0) + 'K'
  return String(p)
}
function formatDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString(ui.locale === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}
function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString(ui.locale === 'vi' ? 'vi-VN' : 'en-US')
}
function formatDayLabel(day) {
  if (!day) return '—'
  return new Date(day).toLocaleDateString(ui.locale === 'vi' ? 'vi-VN' : 'en-US', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
  })
}
</script>

<style scoped>
.admin-page { min-height: 100vh; background: var(--page-bg); color: var(--text); font-family: 'DM Sans', sans-serif; }

/* NAV */
.navbar {
  background: #0d0d0d;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 2rem; height: 60px;
  position: sticky; top: 0; z-index: 100;
}
.nav-logo { font-family: 'Bebas Neue', sans-serif; font-size: 1.8rem; color: #e85d2f; letter-spacing: 2px; text-decoration: none; }
.nav-links { display: flex; gap: 0.25rem; }
.tab-btn {
  background: none; border: none; color: #aaa;
  font-size: 0.85rem; font-weight: 500;
  padding: 0.4rem 0.9rem; border-radius: 4px;
  cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.tab-btn:hover { color: #fff; background: rgba(255,255,255,0.08); }
.tab-btn.active { color: #e85d2f; background: rgba(232,93,47,0.1); }
.nav-user-wrap { display: flex; align-items: center; gap: 1rem; }
.nav-user { display: flex; align-items: center; gap: 0.75rem; font-size: 0.82rem; color: #ccc; }
.role-badge { font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 10px; background: rgba(255,255,255,0.08); color: #e85d2f; }
.btn-logout { background: none; border: 1px solid #444; color: #888; padding: 0.25rem 0.7rem; border-radius: 4px; cursor: pointer; font-size: 0.78rem; transition: all 0.15s; }
.btn-logout:hover { border-color: #e85d2f; color: #e85d2f; }
.icon-btn, .text-btn {
  background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #ccc;
  border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 700;
  transition: all 0.15s; display: inline-flex; align-items: center; justify-content: center;
}
.icon-btn { width: 32px; height: 32px; }
.text-btn { padding: 4px 8px; height: 32px; }
.icon-btn:hover, .text-btn:hover { border-color: var(--accent); color: var(--accent); }

/* STATS ROW */
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--line); border-bottom: 1px solid var(--line); }
.stat-card { background: var(--panel); padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 0.3rem; }
.stat-num { font-family: 'Bebas Neue', sans-serif; font-size: 2rem; color: var(--accent); line-height: 1; }
.stat-label { font-size: 0.75rem; color: var(--muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }

/* CONTENT */
.content { padding: 1.5rem 2rem; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.section-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; letter-spacing: 1px; }
.section-sub { font-size: 0.8rem; color: var(--muted); }
.filter-bar select { border: 1.5px solid var(--line); border-radius: 7px; padding: 0.5rem 0.85rem; font-size: 0.85rem; color: var(--text); background: var(--input-bg); outline: none; cursor: pointer; }

/* TABLE */
.table-wrap { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
thead { background: #0d0d0d; }
thead th { padding: 0.75rem 1rem; text-align: left; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #888; }
tbody tr { border-bottom: 1px solid var(--line); transition: background 0.1s; }
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: rgba(255,255,255,0.02); }
tbody td { padding: 0.8rem 1rem; font-size: 0.875rem; }
.mono { font-family: var(--font-mono, monospace); font-size: 0.8rem; color: var(--muted); }
.loading { text-align: center; padding: 2rem; color: var(--muted); font-size: 0.85rem; }

/* DRIVER SELECT */
.driver-select {
  font-size: 0.78rem; border: 1px solid var(--line); border-radius: 6px;
  padding: 0.25rem 0.5rem; background: var(--input-bg); color: var(--text); cursor: pointer;
}

/* BADGES */
.badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.7rem; font-weight: 600; }
.badge-open      { background: rgba(45,122,79,0.15);   color: #2d7a4f; }
.badge-pending   { background: rgba(240,165,0,0.15);   color: #f0a500; }
.badge-confirmed { background: rgba(13,110,253,0.15);  color: #0d6efd; }
.badge-cancelled { background: rgba(192,57,43,0.15);   color: #c0392b; }
.badge-completed { background: var(--tag-bg);          color: var(--muted); }
.badge-closed    { background: rgba(100,100,100,0.15); color: #888; }
.badge-role-customer { background: rgba(26,111,168,0.15);  color: #1a6fa8; }
.badge-role-driver   { background: rgba(138,98,0,0.15);    color: #8a6200; }
.badge-role-admin    { background: rgba(168,32,32,0.15);   color: #a82020; }
.badge-gw-vnpay  { background: rgba(26,86,219,0.15);   color: #1a56db; }
.badge-gw-momo   { background: rgba(168,32,138,0.15);  color: #a8208a; }
.badge-gw-card   { background: rgba(26,138,26,0.15);   color: #1a8a1a; }
.badge-gw-wallet { background: rgba(133,100,4,0.15);   color: #856404; }
.badge-gw-cash   { background: rgba(26,111,168,0.15);  color: #1a6fa8; }
.badge-pay-success  { background: rgba(45,122,79,0.15);  color: #2d7a4f; }
.badge-pay-pending  { background: rgba(240,165,0,0.15);  color: #f0a500; }
.badge-pay-failed   { background: rgba(192,57,43,0.15);  color: #c0392b; }
.badge-pay-refunded { background: var(--tag-bg);         color: var(--muted); }

/* ── OPERATOR CARDS ── */
.op-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.op-card {
  background: var(--panel);
  border: 1.5px solid var(--line);
  border-radius: 12px;
  padding: 1.1rem 1.25rem;
  cursor: pointer;
  transition: all 0.18s;
}
.op-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(232,93,47,0.15);
}
.op-card-selected {
  border-color: var(--accent);
  background: rgba(232,93,47,0.06);
  box-shadow: 0 0 0 3px rgba(232,93,47,0.15);
}
.op-inactive { opacity: 0.55; }

.op-card-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 0.6rem;
}
.op-name {
  font-weight: 700; font-size: 0.95rem; color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.op-meta {
  display: flex; gap: 0.75rem; margin-bottom: 0.6rem;
}
.op-meta-item { font-size: 0.78rem; color: var(--muted); }
.op-stats-row {
  display: flex; gap: 0.75rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--line);
}
.op-stat { font-size: 0.78rem; color: var(--muted); }

/* ── OPERATOR DETAIL PANEL ── */
.op-detail {
  background: var(--panel);
  border: 1.5px solid var(--accent);
  border-radius: 12px;
  overflow: hidden;
  margin-top: 0.5rem;
  animation: slideDown 0.22s ease;
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: none; }
}

.op-detail-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--line);
  background: rgba(232,93,47,0.04);
}
.op-detail-title-row {
  display: flex; align-items: center; gap: 0.6rem;
}
.op-detail-name {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.2rem; letter-spacing: 1px; color: var(--text);
}
.btn-back-op {
  background: none; border: 1.5px solid var(--line); color: var(--muted);
  border-radius: 6px; width: 28px; height: 28px;
  cursor: pointer; font-size: 0.8rem;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.btn-back-op:hover { border-color: #c0392b; color: #c0392b; }
.op-detail-actions { display: flex; gap: 0.4rem; }

/* Mini-tab bar */
.op-mini-tab-bar {
  display: flex; gap: 0; border-bottom: 1px solid var(--line);
  padding: 0 1.25rem;
}
.op-mini-tab {
  background: none; border: none; border-bottom: 2.5px solid transparent;
  color: var(--muted); font-size: 0.83rem; font-weight: 600;
  padding: 0.7rem 1rem; cursor: pointer; font-family: inherit;
  transition: all 0.15s;
}
.op-mini-tab:hover { color: var(--text); }
.op-mini-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
.mini-tab-count { font-size: 0.72rem; opacity: 0.7; margin-left: 0.25rem; }

/* Detail body */
.op-detail-body { padding: 1.25rem; }

.op-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}
.op-info-item {
  display: flex; flex-direction: column; gap: 0.25rem;
}
.op-info-item.full-span { grid-column: 1 / -1; }
.op-info-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: var(--muted); }
.op-info-val { font-size: 0.9rem; color: var(--text); }

.op-trips-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 0.75rem;
}

.op-tag {
  font-size: 0.72rem; font-weight: 600; padding: 0.18rem 0.55rem;
  border-radius: 20px; background: rgba(138,98,0,0.12); color: #8a6200;
}

/* ── TRIP TABLE ACTIONS ── */
.action-btns { display: flex; gap: 0.35rem; align-items: center; }
.act-btn {
  background: none; border: 1.5px solid var(--line); border-radius: 6px;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.85rem; cursor: pointer; transition: all 0.15s; flex-shrink: 0;
}
.act-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.act-edit:hover   { border-color: #3b82f6; background: rgba(59,130,246,0.08); }
.act-close:hover  { border-color: #f0a500; background: rgba(240,165,0,0.08); }
.act-open:hover   { border-color: #2d7a4f; background: rgba(45,122,79,0.08); }
.act-delete:hover { border-color: #c0392b; background: rgba(192,57,43,0.08); }

/* ── ADD / EDIT BUTTONS ── */
.btn-add-trip {
  background: var(--accent); color: #fff; border: none; border-radius: 8px;
  padding: 0.5rem 1.1rem; font-size: 0.85rem; font-weight: 700;
  cursor: pointer; font-family: inherit; letter-spacing: 0.3px;
  transition: all 0.15s; display: flex; align-items: center; gap: 0.4rem;
}
.btn-add-trip:hover {
  background: var(--accent-hover, #c94d24);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(232,93,47,0.35);
}

/* ── FILTER CHIPS ── */
.trip-filter-row {
  display: flex; flex-direction: column; gap: 0.75rem;
  background: var(--panel); border: 1.5px solid var(--line);
  border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1rem;
}
.filter-group-inline { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.filter-label-inline { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--muted); min-width: 72px; flex-shrink: 0; }
.filter-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.chip {
  background: var(--tag-bg); border: 1.5px solid var(--line); color: var(--muted);
  border-radius: 20px; padding: 0.25rem 0.85rem; font-size: 0.78rem; font-weight: 600;
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.chip:hover { border-color: var(--accent); color: var(--accent); }
.chip.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.filter-result { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.25rem; padding-top: 0.75rem; border-top: 1px solid var(--line); }
.result-count { font-size: 0.82rem; color: var(--muted); }
.result-count strong { color: var(--text); font-size: 1rem; }
.btn-reset-filter {
  background: none; border: 1px solid var(--line); color: var(--muted);
  border-radius: 20px; padding: 0.2rem 0.75rem; font-size: 0.75rem;
  cursor: pointer; transition: all 0.15s;
}
.btn-reset-filter:hover { border-color: #c0392b; color: #c0392b; }

/* ── STATS TAB ── */
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
.kpi-card { background: var(--panel); border: 1.5px solid var(--line); border-radius: 12px; padding: 1.25rem 1.5rem; }
.kpi-card.accent { border-color: var(--accent); background: rgba(232,93,47,0.08); }
.kpi-card.green  { border-color: #b8dfc8; background: rgba(45,122,79,0.08); }
.kpi-card.red    { border-color: #f5c6c2; background: rgba(192,57,43,0.08); }
.kpi-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: var(--muted); margin-bottom: 0.4rem; }
.kpi-value { font-family: 'Bebas Neue', sans-serif; font-size: 1.8rem; color: var(--text); line-height: 1; }
.kpi-card.accent .kpi-value { color: var(--accent); }
.kpi-card.green  .kpi-value { color: #2d7a4f; }
.kpi-card.red    .kpi-value { color: #c0392b; }

.charts-row { display: grid; grid-template-columns: 1fr 280px; gap: 1.5rem; margin-bottom: 1.5rem; }
.chart-panel { background: var(--panel); border: 1.5px solid var(--line); border-radius: 12px; padding: 1.5rem; }
.chart-panel.wide { overflow: hidden; }
.chart-title { font-family: 'Bebas Neue', sans-serif; font-size: 1rem; letter-spacing: 1px; color: var(--muted); margin-bottom: 1rem; }
.chart-empty { color: var(--muted); font-size: 0.85rem; text-align: center; padding: 2rem; }

.bar-chart-wrap { overflow-x: auto; }
.bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 180px; padding-bottom: 28px; min-width: 400px; position: relative; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative; cursor: default; }
.bar-value-hint { font-size: 0.6rem; color: var(--muted); margin-bottom: 2px; white-space: nowrap; }
.bar { width: 100%; max-width: 28px; background: var(--accent); border-radius: 4px 4px 0 0; transition: height 0.4s ease; min-height: 2px; opacity: 0.75; }
.bar.bar-highlight { opacity: 1; background: var(--accent-hover); }
.bar-col:hover .bar { opacity: 1; }
.bar-label { position: absolute; bottom: 0; font-size: 0.6rem; color: var(--muted); text-align: center; white-space: nowrap; }

.donut-wrap { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.donut-svg { width: 130px; height: 130px; }
.donut-center-num   { font-family: 'Bebas Neue', sans-serif; font-size: 22px; fill: var(--text); }
.donut-center-label { font-size: 9px; fill: var(--muted); }
.donut-legend { width: 100%; display: flex; flex-direction: column; gap: 0.5rem; }
.legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.legend-val { margin-left: auto; font-weight: 600; color: var(--text); font-family: var(--font-mono, monospace); font-size: 0.78rem; }
.top-days-panel { margin-top: 0.5rem; }

/* ── MODAL ── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.65);
  backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 1rem; animation: fadeIn 0.15s ease;
}
@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }

.modal-box {
  background: var(--panel, #1a1a1a); border: 1.5px solid var(--line, #2a2a2a);
  border-radius: 16px; width: 100%; max-width: 540px; max-height: 90vh;
  overflow-y: auto; box-shadow: 0 24px 80px rgba(0,0,0,0.5); animation: slideUp 0.2s ease;
}
@keyframes slideUp { from { transform: translateY(20px); opacity:0 } to { transform: none; opacity:1 } }

.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1.25rem 1.5rem 1rem; border-bottom: 1px solid var(--line);
}
.modal-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.3rem; letter-spacing: 1px; color: var(--text); margin: 0; }
.modal-close {
  background: none; border: none; color: var(--muted); font-size: 1.1rem; cursor: pointer;
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  border-radius: 6px; transition: all 0.15s;
}
.modal-close:hover { background: rgba(255,255,255,0.07); color: var(--text); }
.modal-loading { padding: 2rem; text-align: center; color: var(--muted); font-size: 0.85rem; }

.modal-form { padding: 1.25rem 1.5rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }

.form-row  { display: flex; flex-direction: column; gap: 0.35rem; }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.form-col  { display: flex; flex-direction: column; gap: 0.35rem; }

.form-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--muted); }
.form-select, .form-input {
  background: var(--input-bg, #111); border: 1.5px solid var(--line);
  border-radius: 8px; color: var(--text); font-size: 0.88rem; font-family: inherit;
  padding: 0.55rem 0.85rem; outline: none; transition: border-color 0.15s;
  width: 100%; box-sizing: border-box;
}
.form-select:focus, .form-input:focus { border-color: var(--accent); }
.form-error {
  background: rgba(192,57,43,0.1); border: 1px solid rgba(192,57,43,0.3);
  color: #e57373; border-radius: 8px; padding: 0.6rem 0.9rem; font-size: 0.82rem; margin: 0;
}

.modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.25rem; padding-top: 1rem; border-top: 1px solid var(--line); }
.btn-cancel {
  background: none; border: 1.5px solid var(--line); color: var(--muted);
  border-radius: 8px; padding: 0.55rem 1.2rem; font-size: 0.85rem; font-family: inherit;
  cursor: pointer; transition: all 0.15s;
}
.btn-cancel:hover { border-color: #666; color: var(--text); }
.btn-save {
  background: var(--accent); border: none; color: #fff; border-radius: 8px;
  padding: 0.55rem 1.4rem; font-size: 0.88rem; font-weight: 700; font-family: inherit;
  cursor: pointer; transition: all 0.15s;
}
.btn-save:hover:not(:disabled) { background: var(--accent-hover, #c94d24); }
.btn-save:disabled { opacity: 0.55; cursor: not-allowed; }

/* Vehicle empty hint in trip modal */
.vehicle-empty-hint {
  display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
  font-size: 0.8rem; color: var(--muted);
  background: rgba(240,165,0,0.08);
  border: 1px solid rgba(240,165,0,0.25);
  border-radius: 7px;
  padding: 0.5rem 0.85rem;
  margin-top: 0.35rem;
}
.link-btn {
  background: none; border: none; color: var(--accent);
  font-size: 0.82rem; font-weight: 700; cursor: pointer;
  padding: 0; text-decoration: underline; font-family: inherit;
}
.link-btn:hover { color: var(--accent-hover, #c94d24); }

/* Operator vehicle empty state */
.op-empty-vehicle {
  display: flex; align-items: center; justify-content: center;
  gap: 1rem; padding: 2rem;
  background: rgba(255,255,255,0.02);
  border: 1.5px dashed var(--line);
  border-radius: 8px;
  color: var(--muted); font-size: 0.88rem;
}
</style>