add:
    - 页面跳转
        - [x] 补充下一页/上一页按钮，具体页面选择，单页加载多少数据功能
    - 数据表格
        - [x] 支持一个 tab 对应一个表，点击表名打开新的 tab
        - [x] 列名后面加上对应的数据类型
fix:
    - [x] 多页面添加按钮旁边有多余的滚动条

---

add:
    - 窗口管理
        - [x] 去除 Tables 上方的 Connections 区域，只保留右上角一个 Connections 添加按钮
    - 表格列表
        - [x] 添加快速筛选的 input 框，支持普通正则匹配
fix:
    - [x] 分页页码输入框有点小，调整成根据页码自动匹配宽度
edit:
    - Data 区域
        - [x] 只展示数据表格，隐藏 SQL QUERY 区域
        - [x] 把分页放到 right bottom
    - SQL 执行器
        - [x] 把 Run Query 放到单独的 tab
        - [x] Run Query Tab 上方执行 SQL，下方对应展示 SQL 执行对应数据

---

add:
    - 数据表格
        - [x] json 类型渲染成正确的 json
        - [x] 时间类型不需要展示时区
        - [x] 所有数据类型单元格均支持双击弹窗，然后在弹窗里编辑数据
fix:
    - [x] 分页页码输入框在现有基础上加点边距
    - [x] 去除 Query 旁边的 Connect
