<template>
  <footer id="support" class="public-footer" :class="{ dark }">
    <div class="footer-grid">
      <section>
        <div class="brand">
          <span class="brand-mark">P</span>
          <span>PAM TRAVEL</span>
        </div>
        <p>{{ t.description }}</p>
        <div class="socials" aria-label="Social links">
          <a href="#" aria-label="Facebook">f</a>
          <a href="#" aria-label="YouTube">▶</a>
          <a href="#" aria-label="Zalo">Z</a>
        </div>
      </section>

      <section>
        <h3>{{ t.company }}</h3>
        <a href="#routes">{{ t.routes }}</a>
        <a href="#operators">{{ t.operators }}</a>
        <a href="#steps">{{ t.steps }}</a>
      </section>

      <section>
        <h3>{{ t.support }}</h3>
        <a href="tel:19006067">1900 6067</a>
        <a href="mailto:support@pamtravel.vn">support@pamtravel.vn</a>
        <a href="#offers">{{ t.offers }}</a>
      </section>

      <section>
        <h3>{{ t.office }}</h3>
        <p>DataGrip Campus, Hà Nội</p>
        <p>08:00 - 22:00</p>
      </section>
    </div>

    <div class="footer-bottom">
      <span>© 2026 PAM Travel</span>
      <span>{{ t.made }}</span>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  dark: { type: Boolean, default: false },
  locale: { type: String, default: 'vi' },
})

const copy = {
  vi: {
    description: 'Nền tảng đặt vé xe khách, chọn ghế và quản lý vé điện tử cho hành khách liên tỉnh.',
    company: 'Pam Travel',
    routes: 'Tuyến phổ biến',
    operators: 'Nhà xe nổi bật',
    steps: 'Quy trình đặt vé',
    support: 'Hỗ trợ',
    offers: 'Ưu đãi',
    office: 'Văn phòng',
    made: 'Đồ án đặt vé xe khách trực tuyến',
  },
  en: {
    description: 'Intercity bus booking platform with seat selection and digital ticket management.',
    company: 'Pam Travel',
    routes: 'Popular routes',
    operators: 'Featured operators',
    steps: 'Booking flow',
    support: 'Support',
    offers: 'Offers',
    office: 'Office',
    made: 'Online bus ticketing final project',
  },
}

const t = computed(() => copy[props.locale] || copy.vi)
</script>

<style scoped>
.public-footer {
  padding: 56px 40px 24px;
  color: #e9e1d5;
  background: #15191b;
}

.public-footer.dark {
  background: #090c0d;
}

.footer-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr;
  gap: 32px;
  width: min(1160px, 100%);
  margin: 0 auto;
}

section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  color: #fff;
  background: #e85d2f;
  border-radius: 8px;
}

h3 {
  margin: 0 0 4px;
  color: #fff;
  font-size: 15px;
}

p,
a,
.footer-bottom {
  margin: 0;
  color: rgba(233, 225, 213, 0.72);
  font-size: 14px;
  line-height: 1.7;
  text-decoration: none;
}

a:hover {
  color: #f4c15d;
}

.socials {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.socials a {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  font-weight: 800;
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  width: min(1160px, 100%);
  margin: 40px auto 0;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

@media (max-width: 860px) {
  .public-footer {
    padding: 42px 18px 22px;
  }

  .footer-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 560px) {
  .footer-grid {
    grid-template-columns: 1fr;
  }

  .footer-bottom {
    flex-direction: column;
  }
}
</style>
