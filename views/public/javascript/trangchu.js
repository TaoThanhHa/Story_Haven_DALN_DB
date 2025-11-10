let currentPage = 1;
let totalPages = 1;

// 🧩 Render danh sách truyện ra giao diện với tổng view live
function renderStories(stories) {
  const storyContainer = document.getElementById("storyContainer");
  storyContainer.innerHTML = "";

  stories.forEach(story => {
    const storyCard = document.createElement("div");
    storyCard.className = "col-6 col-md-3 mb-3 storyBox";

    storyCard.innerHTML = `
      <a href="/story/${story._id}" class="text-decoration-none">
        <div class="card h-100 shadow-sm">
          <img src="${story.thumbnail || "/images/default.jpg"}" class="card-img-top story-thumbnail">
          <div class="card-body">
            <h5 class="card-title">${story.title}</h5>
            <p class="card-text">
              <i class="fa fa-eye"></i> <span class="story-views">0</span>
              <i class="fa fa-star"></i> <span class="story-votes">0</span>
              <i class="fa fa-bars"></i> <span class="story-chapters">0</span>
            </p>
          </div>
        </div>
      </a>
    `;

    storyContainer.appendChild(storyCard);

    // ✅ VIEW
    fetch(`/api/story/${story._id}/views`)
      .then(r => r.json())
      .then(d => storyCard.querySelector(".story-views").textContent = d.total_views ?? 0);

    // ✅ VOTE
    fetch(`/api/story/${story._id}/votes`)
      .then(r => r.json())
      .then(d => storyCard.querySelector(".story-votes").textContent = d.total_votes ?? 0);

    // ✅ CHAPTER
    fetch(`/api/story/${story._id}/chapters/published`)
      .then(r => r.json())
      .then(d => storyCard.querySelector(".story-chapters").textContent = d.total_chapters ?? 0);

  });
}

async function fetchStories(page = 1) {
  try {
    const response = await fetch(`/api/stories?page=${page}`);
    const data = await response.json();

    if (response.ok && data.success) {
      renderStories(data.stories);

      currentPage = data.currentPage;
      totalPages = data.totalPages;

      // Ẩn thanh phân trang nếu ít hơn 12 truyện
      const pagination = document.querySelector(".pagination-container");
      if (data.total <= 12) {
        pagination.style.display = "none";
      } else {
        pagination.style.display = "flex";
        updatePagination();
      }
    } else {
      console.error("Lỗi API:", data.error || "Không thể tải truyện");
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

function updatePagination() {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  // Nút Trang trước
  pagination.innerHTML += `
    <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
      <button class="page-link" onclick="fetchStories(${currentPage - 1})">«</button>
    </li>
  `;

  // Tính khoảng trang hiển thị
  let start = currentPage - 1;
  let end   = currentPage + 1;

  if (start < 1) {
    start = 1;
    end = 3;
  }
  if (end > totalPages) {
    end = totalPages;
    start = totalPages - 2;
  }
  if (start < 1) start = 1;

  // Dấu ... đầu
  if (start > 1) {
    pagination.innerHTML += `
      <li class="page-item">
        <button class="page-link" onclick="fetchStories(1)">1</button>
      </li>
    `;
    if (start > 2) {
      pagination.innerHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }

  // Các số trang chính
  for (let i = start; i <= end; i++) {
    pagination.innerHTML += `
      <li class="page-item ${i === currentPage ? "active" : ""}">
        <button class="page-link" onclick="fetchStories(${i})">${i}</button>
      </li>
    `;
  }

  // Dấu ... cuối
  if (end < totalPages) {
    if (end < totalPages - 1) {
      pagination.innerHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
    pagination.innerHTML += `
      <li class="page-item">
        <button class="page-link" onclick="fetchStories(${totalPages})">${totalPages}</button>
      </li>
    `;
  }

  // Nút Trang sau
  pagination.innerHTML += `
    <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
      <button class="page-link" onclick="fetchStories(${currentPage + 1})">»</button>
    </li>
  `;
}


document.addEventListener("DOMContentLoaded", () => {
  fetchStories();
});


async function loadRanking(range) {
  const container = document.getElementById("rankingContainer");
  container.innerHTML = `<p class="text-center">Đang tải...</p>`;

  try {
    const res = await fetch(`/api/rankings?range=${range}`);
    const stories = await res.json();

    container.innerHTML = "";

    stories.forEach(story => {
      const card = document.createElement("div");
      card.className = "col-6 col-md-3 mb-3 storyBox";

      card.innerHTML = `
        <a href="/story/${story._id}" class="text-decoration-none">
          <div class="card h-100 shadow-sm">
            <img src="${story.thumbnail || "/images/default.jpg"}" class="card-img-top story-thumbnail">
            <div class="card-body">
              <h5 class="card-title">${story.title}</h5>
              <p class="card-text">
                <i class="fa fa-eye"></i> ${story.total_views ?? 0}
                <i class="fa fa-star"></i> ${story.total_votes ?? 0}
              </p>
            </div>
          </div>
        </a>
      `;

      container.appendChild(card);
    });

  } catch (err) {
    console.error("Lỗi load BXH:", err);
    container.innerHTML = `<p class="text-danger text-center">Không thể tải bảng xếp hạng</p>`;
  }
}



// 🚀 Tải dữ liệu khi trang sẵn sàng
document.addEventListener("DOMContentLoaded", fetchStories);
